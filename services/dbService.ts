import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import lancedb from '@lancedb/lancedb';
import type { FinancialData } from '../types.ts';

const DATA_ROOT = path.join(process.cwd(), 'data');
const DB_ROOT = path.join(DATA_ROOT, 'db');
const VECTOR_ROOT = path.join(DATA_ROOT, 'vectors');

// Ensure directories exist
fs.ensureDirSync(DB_ROOT);
fs.ensureDirSync(VECTOR_ROOT);

let mainDb: Database.Database | null = null;

// Cache for project database connections
const projectDbConnections: Record<string, Database.Database> = {};

function getMainDb(): Database.Database {
    if (!mainDb) {
        try {
            console.log(`[DB] Opening main database at ${path.join(DB_ROOT, 'main.db')}`);
            fs.ensureDirSync(DB_ROOT);
            fs.ensureDirSync(VECTOR_ROOT);
            const mainDbPath = path.join(DB_ROOT, 'main.db');
            mainDb = new Database(mainDbPath);
            mainDb.pragma('journal_mode = WAL');
            
            mainDb.exec(`
              CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                project_status TEXT DEFAULT 'active',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at 
              AFTER UPDATE ON projects
              BEGIN
                UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE project_id = NEW.project_id;
              END;
            
              CREATE TABLE IF NOT EXISTS global_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TRIGGER IF NOT EXISTS trg_global_settings_updated_at
              AFTER UPDATE ON global_settings
              BEGIN
                UPDATE global_settings SET updated_at = CURRENT_TIMESTAMP WHERE setting_key = NEW.setting_key;
              END;
            `);
    
            const ensureColumn = (db: Database.Database, table: string, column: string, definition: string) => {
                try {
                    const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
                    if (!info.some(col => col.name === column)) {
                        console.log(`[DB] Migration: Adding column ${column} to table ${table}...`);
                        if (definition.toUpperCase().includes('CURRENT_TIMESTAMP')) {
                            const typePart = definition.split(' ')[0];
                            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typePart}`);
                            db.exec(`UPDATE ${table} SET ${column} = CURRENT_TIMESTAMP WHERE ${column} IS NULL`);
                        } else {
                            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                        }
                        console.log(`[DB] Migration: Success adding ${column} to ${table}`);
                    }
                } catch (e) {
                    console.error(`[DB] Migration failed for ${table}.${column}:`, e);
                }
            };

            // Legacy support / Migrations
            const tableInfo = mainDb.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
            const hasId = tableInfo.some(c => c.name === 'id');
            const hasName = tableInfo.some(c => c.name === 'name');
            const hasProjectId = tableInfo.some(c => c.name === 'project_id');
            const hasProjectName = tableInfo.some(c => c.name === 'project_name');

            if (hasId && !hasProjectId) {
                console.log("[DB] Migration: Renaming 'id' to 'project_id' in 'projects' table");
                try {
                    mainDb.exec("ALTER TABLE projects RENAME COLUMN id TO project_id");
                } catch (e) {
                    console.warn("[DB] Migration warning: RENAME COLUMN id failed, trying manual", e);
                    mainDb.exec("ALTER TABLE projects ADD COLUMN project_id TEXT");
                    mainDb.exec("UPDATE projects SET project_id = id WHERE project_id IS NULL AND id IS NOT NULL");
                }
            }
            if (hasName && !hasProjectName) {
                console.log("[DB] Migration: Renaming 'name' to 'project_name' in 'projects' table");
                try {
                    mainDb.exec("ALTER TABLE projects RENAME COLUMN name TO project_name");
                } catch (e) {
                    console.warn("[DB] Migration warning: RENAME COLUMN name failed, trying manual", e);
                    mainDb.exec("ALTER TABLE projects ADD COLUMN project_name TEXT");
                    mainDb.exec("UPDATE projects SET project_name = name WHERE project_name IS NULL AND name IS NOT NULL");
                }
            }

            // Ensure all columns exist regardless of previous state
            ensureColumn(mainDb, 'projects', 'project_id', "TEXT");
            ensureColumn(mainDb, 'projects', 'project_name', "TEXT");
            ensureColumn(mainDb, 'projects', 'project_status', "TEXT DEFAULT 'active'");
            ensureColumn(mainDb, 'projects', 'metadata', "TEXT");
            ensureColumn(mainDb, 'projects', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
            ensureColumn(mainDb, 'projects', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

            // Global settings migration
            const settingsInfo = mainDb.prepare("PRAGMA table_info(global_settings)").all() as { name: string }[];
            const hasKey = settingsInfo.some(c => c.name === 'key');
            const hasSettingKey = settingsInfo.some(c => c.name === 'setting_key');
            if (hasKey && !hasSettingKey) {
                console.log("[DB] Migration: Renaming 'key' to 'setting_key' in 'global_settings' table");
                try {
                    mainDb.exec("ALTER TABLE global_settings RENAME COLUMN key TO setting_key");
                } catch (e) {
                    mainDb.exec("ALTER TABLE global_settings ADD COLUMN setting_key TEXT");
                    mainDb.exec("UPDATE global_settings SET setting_key = key");
                }
            }
            if (settingsInfo.some(c => c.name === 'value') && !settingsInfo.some(c => c.name === 'setting_value')) {
                console.log("[DB] Migration: Renaming 'value' to 'setting_value' in 'global_settings' table");
                try {
                    mainDb.exec("ALTER TABLE global_settings RENAME COLUMN value TO setting_value");
                } catch (e) {
                    mainDb.exec("ALTER TABLE global_settings ADD COLUMN setting_value TEXT");
                    mainDb.exec("UPDATE global_settings SET setting_value = value");
                }
            }

            ensureColumn(mainDb, 'global_settings', 'setting_key', "TEXT");
            ensureColumn(mainDb, 'global_settings', 'setting_value', "TEXT");
            ensureColumn(mainDb, 'global_settings', 'metadata', "TEXT");
            ensureColumn(mainDb, 'global_settings', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
            ensureColumn(mainDb, 'global_settings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

            // Final verification and cleanup
            const finalInfo = mainDb.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
            if (!finalInfo.some(c => c.name === 'project_name')) {
                 mainDb.exec("ALTER TABLE projects ADD COLUMN project_name TEXT DEFAULT 'Unbenannt'");
            }
            if (!finalInfo.some(c => c.name === 'project_id')) {
                 mainDb.exec("ALTER TABLE projects ADD COLUMN project_id TEXT");
            }
        } catch (err) {
            console.error('[DB] Failed to open main database:', err);
            throw err;
        }
    }
    return mainDb;
}

function getProjectDb(projectId: string): Database.Database {
    if (projectDbConnections[projectId]) {
        return projectDbConnections[projectId];
    }
    try {
        fs.ensureDirSync(DB_ROOT);
        const dbPath = path.join(DB_ROOT, `project_${projectId}.db`);
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL'); 
        projectDbConnections[projectId] = db;
        
        // Ensure initialization for new or existing databases (direct call to avoid recursion)
        initProjectDataSchema(db, projectId);
        
        return db;
    } catch (err) {
        console.error(`[DB] Failed to open project database for ${projectId}:`, err);
        throw err;
    }
}

function initProjectDataSchema(db: Database.Database, projectId: string) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_data (
            data_id TEXT PRIMARY KEY,
            data_json TEXT NOT NULL,
            raw_content TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TRIGGER IF NOT EXISTS trg_project_data_updated_at
        AFTER UPDATE ON project_data
        BEGIN
            UPDATE project_data SET updated_at = CURRENT_TIMESTAMP WHERE data_id = NEW.data_id;
        END;
    `);

    const ensureColumn = (db: Database.Database, table: string, column: string, definition: string) => {
        try {
            const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
            if (!info.some(col => col.name === column)) {
                if (definition.toUpperCase().includes('CURRENT_TIMESTAMP')) {
                    const typePart = definition.split(' ')[0];
                    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typePart}`);
                    db.exec(`UPDATE ${table} SET ${column} = CURRENT_TIMESTAMP WHERE ${column} IS NULL`);
                } else {
                    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                }
            }
        } catch (e) {}
    };

    const projTableInfo = db.prepare("PRAGMA table_info(project_data)").all() as { name: string }[];
    const hasProjId = projTableInfo.some(c => c.name === 'id');
    const hasProjDataId = projTableInfo.some(c => c.name === 'data_id');

    if (hasProjId && !hasProjDataId) {
        console.log(`[DB] Migration: Renaming 'id' to 'data_id' in project_data for project ${projectId}`);
        try {
            db.exec("ALTER TABLE project_data RENAME COLUMN id TO data_id");
        } catch (e) {
            console.warn(`[DB] Project Migration warning: RENAME COLUMN id failed for ${projectId}`, e);
            ensureColumn(db, 'project_data', 'data_id', 'TEXT');
            db.exec("UPDATE project_data SET data_id = id WHERE data_id IS NULL AND id IS NOT NULL");
        }
    }
    ensureColumn(db, 'project_data', 'data_id', 'TEXT');
    ensureColumn(db, 'project_data', 'raw_content', 'TEXT');
    ensureColumn(db, 'project_data', 'metadata', 'TEXT');
    ensureColumn(db, 'project_data', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    ensureColumn(db, 'project_data', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
}

export interface ProjectMetadata {
    project_id: string;
    project_name: string;
    project_status: string; 
    metadata: string | null; 
    created_at: string;
    updated_at: string;
}

export const dbService = {
    // --- Global Operations ---
    
    async initialize() {
        console.log('[DB] Running initialization...');
        getMainDb();
        console.log('[DB] Main database ready.');
    },

    validateProjectId(id: string): void {
        const idRegex = /^[a-zA-Z0-9_\-]+$/;
        if (!idRegex.test(id)) {
            throw new Error('Ungültige Projekt-ID. Nur Buchstaben, Zahlen, Unterstriche und Bindestriche sind erlaubt.');
        }
    },

    async getProjects(): Promise<ProjectMetadata[]> {
        return getMainDb().prepare('SELECT project_id, project_name, metadata, project_status, created_at, updated_at FROM projects ORDER BY updated_at DESC').all() as ProjectMetadata[];
    },

    async registerProject(id: string, name: string, metadata?: Record<string, unknown>) {
        this.validateProjectId(id);
        const metadataJson = metadata ? JSON.stringify(metadata) : null;
        getMainDb().prepare('INSERT OR REPLACE INTO projects (project_id, project_name, metadata) VALUES (?, ?, ?)')
            .run(id, name, metadataJson);
        await this.initProjectDb(id);
    },

    async deleteProject(id: string) {
        this.validateProjectId(id);
        getMainDb().prepare('DELETE FROM projects WHERE project_id = ?').run(id);
        
        if (projectDbConnections[id]) {
            projectDbConnections[id].close();
            delete projectDbConnections[id];
        }

        const dbPath = path.join(DB_ROOT, `project_${id}.db`);
        if (await fs.pathExists(dbPath)) {
            await fs.remove(dbPath);
        }
        const vectorPath = path.join(VECTOR_ROOT, `project_${id}`);
        if (await fs.pathExists(vectorPath)) {
            await fs.remove(vectorPath);
        }
    },

    async setGlobalSetting(settingKey: string, value: unknown) {
        getMainDb().prepare('INSERT OR REPLACE INTO global_settings (setting_key, setting_value) VALUES (?, ?)')
            .run(settingKey, JSON.stringify(value));
    },

    async getGlobalSetting<T>(settingKey: string): Promise<T | null> {
        const row = getMainDb().prepare('SELECT setting_value FROM global_settings WHERE setting_key = ?').get(settingKey) as { setting_value: string } | undefined;
        return row ? JSON.parse(row.setting_value) : null;
    },

    // --- Project-Specific Operations ---

    async initProjectDb(projectId: string) {
        this.validateProjectId(projectId);
        getProjectDb(projectId); // This now calls initProjectDataSchema internally
    },

    async saveProjectData(projectId: string, data: FinancialData, rawContent?: string, metadata?: Record<string, unknown>) {
        if (!data) throw new Error("Keine Projektdaten zum Speichern bereitgestellt.");
        this.validateProjectId(projectId);
        const db = getProjectDb(projectId);
        const docId = String(data.settings?.id || 'singleton');
        const dataJson = JSON.stringify(data);
        const metadataJson = metadata ? JSON.stringify(metadata) : null;
        const rawContentSafe = rawContent || null;
        
        db.prepare('INSERT OR REPLACE INTO project_data (data_id, data_json, raw_content, metadata) VALUES (?, ?, ?, ?)')
            .run(docId, dataJson, rawContentSafe, metadataJson);
        
        getMainDb().prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE project_id = ?').run(projectId);
    },

    async loadProjectData(projectId: string): Promise<FinancialData | null> {
        this.validateProjectId(projectId);
        const dbPath = path.join(DB_ROOT, `project_${projectId}.db`);
        if (!(await fs.pathExists(dbPath))) return null;
        
        const db = getProjectDb(projectId);
        const row = db.prepare('SELECT data_json FROM project_data').get() as { data_json: string } | undefined;
        return row ? JSON.parse(row.data_json) : null;
    },

    // --- LanceDB (Vector) Operations ---

    async getVectorDb(projectId: string) {
        this.validateProjectId(projectId);
        const vectorPath = path.join(VECTOR_ROOT, `project_${projectId}`);
        await fs.ensureDir(vectorPath);
        return await lancedb.connect(vectorPath);
    },

    async addVectors(projectId: string, tableName: string, data: Record<string, unknown>[]) {
        if (!data || data.length === 0) {
            return null;
        }
        const db = await this.getVectorDb(projectId);
        try {
            const table = await db.openTable(tableName);
            await table.add(data);
            return table;
        } catch (e) {
            const table = await db.createTable(tableName, data);
            return table;
        }
    },

    async queryVectors(projectId: string, tableName: string, vector: number[], limit: number = 5) {
        try {
            const db = await this.getVectorDb(projectId);
            const tableNames = await db.tableNames();
            if (!tableNames.includes(tableName)) {
                console.warn(`[DB] Table ${tableName} does not exist for project ${projectId}. Returning empty results.`);
                return [];
            }
            const table = await db.openTable(tableName);
            return await table.search(vector).limit(limit).toArray();
        } catch (e) {
            console.error(`[DB] queryVectors failed:`, e);
            return [];
        }
    }
};
