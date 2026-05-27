/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

export enum Type {
    STRING = "STRING",
    NUMBER = "NUMBER",
    INTEGER = "INTEGER",
    BOOLEAN = "BOOLEAN",
    ARRAY = "ARRAY",
    OBJECT = "OBJECT",
}

const opCostSubItemSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        costs: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } }
    },
    required: ["id", "name", "costs"]
};

const opCostCategorySchema = {
    type: Type.OBJECT,
    properties: {
        isExpanded: { type: Type.BOOLEAN },
        directCosts: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
        subItems: { type: Type.ARRAY, items: opCostSubItemSchema }
    },
    required: ["isExpanded", "directCosts", "subItems"]
};

const privateNeedSubItemSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        costs: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } }
    },
    required: ["id", "name", "costs"]
};

export const aiFinancialDataSchema = {
    type: Type.OBJECT,
    properties: {
        settings: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                companyName: { type: Type.STRING },
                legalForm: { type: Type.STRING },
                foundationDate: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
                planningYears: { type: Type.INTEGER },
            },
            required: ["title", "companyName", "legalForm", "foundationDate", "planningYears"]
        },
        products: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING }, name: { type: Type.STRING }, description: { type: Type.STRING }, target_price: { type: Type.NUMBER }, umsatzsteuer_satz: { type: Type.NUMBER },
                    materialkosten: { type: Type.NUMBER }, fertigungskosten: { type: Type.NUMBER }, verwaltungskosten: { type: Type.NUMBER },
                    marketing_vertriebskosten: { type: Type.NUMBER }, marge_prozent: { type: Type.NUMBER }, sonstige_kosten: { type: Type.NUMBER },
                    einnahmenverzoegerung_wochen: { type: Type.NUMBER }, vorbehalt_prozent: { type: Type.NUMBER }, vorbehalt_verzoegerung_wochen: { type: Type.NUMBER },
                },
                required: ["id", "name", "target_price", "umsatzsteuer_satz", "materialkosten", "fertigungskosten", "verwaltungskosten", "marketing_vertriebskosten", "marge_prozent", "sonstige_kosten", "einnahmenverzoegerung_wochen", "vorbehalt_prozent", "vorbehalt_verzoegerung_wochen"]
            }
        },
        sales: {
            type: Type.ARRAY,
            description: "An array of sales data per product. Each item links a product ID to its sales figures.",
            items: {
                type: Type.OBJECT,
                properties: {
                    productId: { type: Type.STRING, description: "The ID of the product, must match an ID from the products list." },
                    yearlySales: {
                        type: Type.ARRAY,
                        description: "An array of years, which in turn are arrays of 12 months with sales quantities.",
                        items: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                    }
                },
                required: ["productId", "yearlySales"]
            }
        },
        privateNeeds: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    isExpanded: { type: Type.BOOLEAN },
                    directCosts: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } } },
                    subItems: {
                        type: Type.ARRAY,
                        items: privateNeedSubItemSchema,
                    }
                },
                required: ["id", "category", "isExpanded", "directCosts", "subItems"]
            }
        },
        financing: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING }, source: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING, enum: ['equity', 'debt'] },
                    amount: { type: Type.NUMBER }, interestRate: { type: Type.NUMBER }, startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING }, graceMonths: { type: Type.NUMBER },
                },
                required: ["id", "source", "type", "amount", "interestRate"]
            }
        },
        assets: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING }, name: { type: Type.STRING }, description: { type: Type.STRING }, purchase_price: { type: Type.NUMBER },
                    useful_life_years: { type: Type.NUMBER }, purchase_date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
                    afa_category: { type: Type.STRING },
                },
                required: ["id", "name", "purchase_price", "useful_life_years", "purchase_date", "afa_category"]
            }
        },
        startupCosts: {
            type: Type.OBJECT,
            properties: {
                warenlager_material: { type: Type.NUMBER }, sonstiges_forschung_entwicklung: { type: Type.NUMBER }, beratung_gruendung: { type: Type.NUMBER },
                marketing_reisen: { type: Type.NUMBER }, gewerbeanmeldung_gebuehren: { type: Type.NUMBER }, stammeinlage_kapital: { type: Type.NUMBER },
                makler_kaution: { type: Type.NUMBER }, lizenzen_sonstiges: { type: Type.NUMBER },
            },
            required: ["warenlager_material", "sonstiges_forschung_entwicklung", "beratung_gruendung", "marketing_reisen", "gewerbeanmeldung_gebuehren", "stammeinlage_kapital", "makler_kaution", "lizenzen_sonstiges"]
        },
        operationalCosts: {
            type: Type.OBJECT,
            properties: {
                geschaeftsfuehrung_gehalt: opCostCategorySchema,
                personalkosten: opCostCategorySchema,
                raumkosten: opCostCategorySchema,
                buerokosten: opCostCategorySchema,
                fahrzeugkosten: opCostCategorySchema,
                werbekosten: opCostCategorySchema,
                versicherungen_beitraege: opCostCategorySchema,
                beratungskosten: opCostCategorySchema,
                reisekosten: opCostCategorySchema,
                sonstige_betriebsausgaben: opCostCategorySchema,
            },
            required: ['geschaeftsfuehrung_gehalt', 'personalkosten', 'raumkosten', 'buerokosten', 'fahrzeugkosten', 'werbekosten', 'versicherungen_beitraege', 'beratungskosten', 'reisekosten', 'sonstige_betriebsausgaben']
        }
    },
    required: ["settings", "products", "sales", "privateNeeds", "financing", "assets", "startupCosts", "operationalCosts"]
};