/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { ModalInfo, Project, SaveHistoryEntry, AiSettings } from '../types.ts';
import { Icon } from './Icon.tsx';

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image'],
        ['clean']
    ],
};

const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
];

interface AppModalsProps {
    modalInfo: ModalInfo | null;
    setModalInfo: (info: ModalInfo | null) => void;
    activeProject?: Project;
    executeSwitchProject: (projectId: string) => void;
    executeNewProject: () => void;
    executeDeleteProject: (projectId: string) => void;
    executeResetProject: () => void;
    handleImportOverwrite: (projectToOverwrite: Project, newData: Project) => void;
    handleImportAsCopy: (projectToImport: Project) => void;
    executeRestore: (entry: SaveHistoryEntry) => void;
    plansToPrint: Record<string, boolean>;
    setPlansToPrint: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    aiSettings?: AiSettings;
    setNotification: (notification: { message: string; id: number; } | null) => void;
}

const Modal = ({ title, onClose, children, hideTitle = false, className = '' }: { title: string, onClose: () => void, children: React.ReactNode, hideTitle?: boolean, className?: string }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className={`modal-content ${className}`} onClick={e => e.stopPropagation()}>
            {!hideTitle && <h2>{title}</h2>}
            {children}
        </div>
    </div>
);


const PrintModal = ({ onClose, plansToPrint, setPlansToPrint }: { onClose: () => void, plansToPrint: Record<string, boolean>, setPlansToPrint: React.Dispatch<React.SetStateAction<Record<string, boolean>>> }) => {
    const { t } = useTranslation();
    const printableSections = useMemo(() => ([
        { type: 'group', label: t('modals.print.groups.general') },
        { id: 'grundeinstellungen', label: t('modals.print.sections.deckblatt') },
        { id: 'privatbedarf', label: t('modals.print.sections.privatbedarf') },
        { id: 'finanzierungsplan', label: t('modals.print.sections.finanzierungsplan') },
        { id: 'abschreibungsplan', label: t('modals.print.sections.abschreibungsplan') },
        { id: 'produkt_preiskalkulation', label: t('modals.print.sections.umsatzkalkulation') },
        { id: 'absatzplan', label: t('modals.print.sections.absatzplan') },
        { id: 'ertragsplan', label: t('modals.print.sections.ertragsplan') },
        { id: 'liquiditaetsplan', label: t('modals.print.sections.liquiditaetsplan') },
        { type: 'group', label: t('modals.print.groups.analysis') },
        { id: 'statistikJahresuebersichten', label: t('modals.print.sections.jahresuebersichten') },
        { id: 'statistikBanken', label: t('modals.print.sections.banken') },
        { id: 'statistikInvestoren', label: t('modals.print.sections.investoren') },
        { id: 'statistikFoerdergeber', label: t('modals.print.sections.foerdergeber') },
        { id: 'szenariovergleich', label: t('modals.print.sections.szenariovergleich') },
    ] as ({ type: 'group', label: string } | { id: string, label: string })[]), [t]);

    const handlePrint = () => {
        window.print();
    };

    const handleToggleAll = (state: boolean) => {
        const newPlans = { ...plansToPrint };
        printableSections.forEach(section => {
            if ('id' in section) {
                newPlans[section.id] = state;
            }
        });
        setPlansToPrint(newPlans);
    };
    
    return (
        <Modal title={t('modals.print.title')} onClose={onClose}>
            <p>{t('modals.print.description')}</p>
            <div className="print-options-grid">
                {printableSections.map((section, index) => {
                    if ('type' in section && section.type === 'group') {
                        return <h3 key={index} className="print-options-group-title">{section.label}</h3>;
                    }

                    if ('id' in section) {
                        return (
                            <label key={section.id} className="checkbox-label">
                                <input type="checkbox" checked={!!plansToPrint[section.id]} onChange={e => setPlansToPrint({ ...plansToPrint, [section.id]: e.target.checked })} />
                                <span>{section.label}</span>
                            </label>
                        );
                    }
                    return null;
                })}
            </div>
            <div className="modal-actions" style={{justifyContent: 'space-between', marginTop: '2rem'}}>
                <div className="modal-action-group">
                    <button className="btn-link" onClick={() => handleToggleAll(true)}>{t('modals.print.select_all')}</button>
                    <button className="btn-link" onClick={() => handleToggleAll(false)}>{t('modals.print.deselect_all')}</button>
                </div>
                <div className="modal-action-group">
                    <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={handlePrint}>{t('modals.print.print_button')}</button>
                </div>
            </div>
        </Modal>
    );
};

const SendEmailModal = ({ onClose, activeProject, aiSettings, setNotification }: { onClose: () => void, activeProject?: Project, aiSettings?: AiSettings, setNotification: (n: { message: string, id: number } | null) => void }) => {
    const { t } = useTranslation();
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    
    const defaultSubject = t('modals.email.default_subject', { projectName: activeProject?.projectName || t('grundeinstellungen.project_without_name') });
    const defaultBody = t('modals.email.default_body', { projectName: activeProject?.projectName || t('grundeinstellungen.project_without_name') });

    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [isSending, setIsSending] = useState(false);
    const [selectedSignatureId, setSelectedSignatureId] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const signatures = aiSettings?.signatures || [];
    const templates = aiSettings?.templates || [];

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        setSelectedTemplateId(templateId);
        if (templateId) {
            const template = templates.find(t => t.id === templateId);
            if (template) {
                setSubject(template.subject);
                setBody(template.body);
                // Clear signature selection when template is applied to avoid confusion, 
                // or we could append signature if one was already selected.
                // For simplicity, let's just set the template.
                setSelectedSignatureId(''); 
            }
        } else {
            setSubject(defaultSubject);
            setBody(defaultBody);
        }
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sigId = e.target.value;
        setSelectedSignatureId(sigId);
        if (sigId) {
            const sig = signatures.find(s => s.id === sigId);
            if (sig) {
                // If it's HTML, we just append it. ReactQuill handles HTML.
                setBody(prev => {
                    const separator = prev.trim() ? '<br><br>' : '';
                    return prev + separator + sig.content;
                });
            }
        }
    };

    const [attachProjectJson, setAttachProjectJson] = useState(true);
    const [attachProjectPdf, setAttachProjectPdf] = useState(false);
    const [manualAttachments, setManualAttachments] = useState<{name: string, data: string, type: string}[]>([]);
    const [ragDocuments, setRagDocuments] = useState<{title: string, timestamp: string}[]>([]);
    const [selectedRagDocs, setSelectedRagDocs] = useState<string[]>([]);
    const [isLoadingRag, setIsLoadingRag] = useState(false);

    useEffect(() => {
        if (activeProject?.id) {
            fetchRagDocuments();
        }
    }, [activeProject?.id]);

    const fetchRagDocuments = async () => {
        if (!activeProject?.id) return;
        setIsLoadingRag(true);
        try {
            const response = await fetch(`/api/vectors/documents?projectId=${activeProject.id}`);
            if (response.ok) {
                const data = await response.json();
                setRagDocuments(data);
            }
        } catch (error) {
            console.error("Error fetching RAG documents:", error);
        } finally {
            setIsLoadingRag(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: {name: string, data: string, type: string}[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const base64 = await fileToBase64(file);
            newAttachments.push({
                name: file.name,
                data: base64,
                type: file.type
            });
        }
        setManualAttachments(prev => [...prev, ...newAttachments]);
        e.target.value = '';
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });
    };

    const removeAttachment = (index: number) => {
        setManualAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const toggleRagDoc = (title: string) => {
        setSelectedRagDocs(prev => 
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    const generatePdf = async (): Promise<{name: string, data: string, type: string} | null> => {
        const element = document.getElementById('printable-area');
        if (!element) {
            console.error("Printable area not found");
            return null;
        }

        const originalDisplay = element.style.display;
        const originalPosition = element.style.position;
        const originalLeft = element.style.left;
        const originalVisibility = element.style.visibility;
        const originalWidth = element.style.width;

        try {
            // Force display to be able to capture it
            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '0';
            element.style.top = '0';
            element.style.width = '1200px'; // Set a fixed width for consistent PDF layout
            element.style.visibility = 'visible';
            element.style.zIndex = '-1000';

            const canvas = await html2canvas(element, {
                scale: 1, // Reduced scale for smaller file size
                useCORS: true,
                logging: false,
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('printable-area');
                    if (clonedElement) {
                        clonedElement.style.display = 'block';
                        clonedElement.style.visibility = 'visible';
                        clonedElement.style.position = 'static'; // Ensure it's not absolutely positioned in the clone
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.75); // Use JPEG with 75% quality for much smaller size
            const pdf = new jsPDF('p', 'mm', 'a4', true); // Enable compression
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Check if multiple pages are needed
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
            }

            const pdfOutput = pdf.output('blob');
            const base64 = await blobToBase64(pdfOutput);
            return {
                name: `projekt_${activeProject?.projectName.replace(/\s/g, '_') || 'export'}.pdf`,
                data: base64,
                type: 'application/pdf'
            };
        } catch (error) {
            console.error("PDF Generation error:", error);
            return null;
        } finally {
            element.style.display = originalDisplay;
            element.style.position = originalPosition;
            element.style.left = originalLeft;
            element.style.visibility = originalVisibility;
            element.style.width = originalWidth;
        }
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String.split(',')[1]);
            };
            reader.onerror = reject;
        });
    };

    const handleSend = async () => {
        if (!to) return;
        if (!aiSettings?.smtp?.host || !aiSettings?.smtp?.user || !aiSettings?.smtp?.pass) {
            alert(t('modals.email.smtp_error'));
            return;
        }

        setIsSending(true);
        try {
            const finalAttachments: {name: string, data: string, type: string}[] = [...manualAttachments];

            // Project JSON
            if (attachProjectJson && activeProject) {
                const projectData = JSON.stringify(activeProject, null, 2);
                const base64Data = btoa(unescape(encodeURIComponent(projectData)));
                finalAttachments.push({
                    name: `projekt_${activeProject.projectName.replace(/\s/g, '_') || 'export'}.json`,
                    data: base64Data,
                    type: 'application/json'
                });
            }

            // Project PDF
            if (attachProjectPdf) {
                const pdfAtt = await generatePdf();
                if (pdfAtt) finalAttachments.push(pdfAtt);
            }

            // RAG Documents
            for (const docTitle of selectedRagDocs) {
                try {
                    const resp = await fetch(`/api/vectors/document-content?projectId=${activeProject?.id}&title=${encodeURIComponent(docTitle)}`);
                    if (resp.ok) {
                        const { text } = await resp.json();
                        const base64 = btoa(unescape(encodeURIComponent(text)));
                        finalAttachments.push({
                            name: `${docTitle}.txt`,
                            data: base64,
                            type: 'text/plain'
                        });
                    }
                } catch (e) {
                    console.error(`Error attaching RAG doc ${docTitle}:`, e);
                }
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    smtp: aiSettings.smtp,
                    to,
                    cc,
                    bcc,
                    subject,
                    body,
                    attachments: finalAttachments
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Email sent successfully:', result);
                
                if (result.rejected && result.rejected.length > 0) {
                    setNotification({ 
                        message: t('modals.email.success_partial', { rejected: result.rejected.join(', ') }), 
                        id: Date.now() 
                    });
                } else {
                    setNotification({ message: t('modals.email.success'), id: Date.now() });
                }
                onClose();
            } else {
                let errorMessage = '';
                
                try {
                    const errData = await response.json();
                    errorMessage = errData.details || errData.error || 'Unknown error';
                } catch (parseError) {
                    errorMessage = `Server Error (${response.status}): ${response.statusText}. The request might be too large or the server timed out.`;
                }
                
                throw new Error(errorMessage);
            }
        } catch (err: unknown) {
            console.error('Send Email Error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            
            // Show a more user-friendly error for common issues
            let friendlyMsg = msg;
            if (msg.includes('JSON.parse') || msg.includes('Server Error')) {
                friendlyMsg = t('modals.email.error_server_html', { defaultValue: 'Der Server konnte die Anfrage nicht verarbeiten. Eventuell ist der Anhang zu groß.' });
            }
            
            alert(t('modals.email.error', { message: friendlyMsg }));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal title={t('modals.email.title')} onClose={onClose} className="email-modal">
            <div className="email-modal-grid">
                <div className="email-form-section">
                    <div className="form-group">
                        <label>{t('modals.email.to')}</label>
                        <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder={t('modals.email.placeholder_to')} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('modals.email.cc')}</label>
                            <input type="email" value={cc} onChange={e => setCc(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>{t('modals.email.bcc') || 'Bcc'}</label>
                            <input type="email" value={bcc} onChange={e => setBcc(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>{t('modals.email.subject')}</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
                    </div>
                    {templates.length > 0 && (
                        <div className="form-group">
                            <label>{t('modals.email.template_select')}</label>
                            <select value={selectedTemplateId} onChange={handleTemplateChange}>
                                <option value="">{t('modals.email.no_template')}</option>
                                {templates.map(tmp => (
                                    <option key={tmp.id} value={tmp.id}>{tmp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {signatures.length > 0 && (
                        <div className="form-group">
                            <label>{t('modals.email.signature_select')}</label>
                            <select value={selectedSignatureId} onChange={handleSignatureChange}>
                                <option value="">{t('modals.email.no_signature')}</option>
                                {signatures.map(sig => (
                                    <option key={sig.id} value={sig.id}>{sig.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="email-attachments-section">
                    <h3>{t('modals.email.attachments_title')}</h3>
                    
                    <div className="attachment-options">
                        <label className="checkbox-label">
                            <input type="checkbox" checked={attachProjectJson} onChange={e => setAttachProjectJson(e.target.checked)} />
                            <span>{t('modals.email.attachment_json')}</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={attachProjectPdf} onChange={e => setAttachProjectPdf(e.target.checked)} />
                            <span>{t('modals.email.attachment_pdf')}</span>
                        </label>
                    </div>

                    <div className="manual-upload">
                        <div className="tooltip-wrapper" data-tooltip={t('modals.email.upload_files')}>
                            <label className="btn-icon-primary" style={{ cursor: 'pointer' }}>
                                <Icon icon="upload" size={16} />
                                <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    {manualAttachments.length > 0 && (
                        <div className="attachment-list">
                            {manualAttachments.map((att, idx) => (
                                <div key={idx} className="attachment-item">
                                    <Icon icon="file" size={14} />
                                    <span className="file-name">{att.name}</span>
                                    <button className="remove-btn" onClick={() => removeAttachment(idx)}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="rag-attachments">
                        <h4>{t('modals.email.rag_docs_title')}</h4>
                        {isLoadingRag ? (
                            <p className="text-sm italic">{t('modals.email.rag_loading')}</p>
                        ) : ragDocuments.length > 0 ? (
                            <div className="rag-docs-list">
                                {ragDocuments.map(doc => (
                                    <label key={doc.title} className="rag-doc-item">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedRagDocs.includes(doc.title)} 
                                            onChange={() => toggleRagDoc(doc.title)} 
                                        />
                                        <span className="text-xs truncate" title={doc.title}>{doc.title}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">{t('modals.email.rag_empty')}</p>
                        )}
                    </div>
                </div>

                {/* Message Editor full width */}
                <div className="form-group quill-editor-wrapper email-message-full-width">
                    <label>{t('modals.email.message')}</label>
                    <ReactQuill 
                        theme="snow"
                        value={body}
                        onChange={setBody}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder={t('modals.email.placeholder_message')}
                        className="html-editor"
                    />
                </div>
            </div>

            <p className="help-text">{t('modals.email.hint')}</p>
            <div className="modal-actions left-aligned">
                <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
                <button className="btn-primary" onClick={handleSend} disabled={isSending || !to}>
                    {isSending ? t('modals.email.sending_button') : t('modals.email.send_button')}
                </button>
            </div>
        </Modal>
    );
};


export const AppModals = ({
    modalInfo,
    setModalInfo,
    activeProject,
    executeDeleteProject,
    executeNewProject,
    executeResetProject,
    executeRestore,
    executeSwitchProject,
    handleImportAsCopy,
    handleImportOverwrite,
    plansToPrint,
    setPlansToPrint,
    aiSettings,
    setNotification
}: AppModalsProps) => {
    const { t, i18n } = useTranslation();
    if (!modalInfo) return null;
    
    switch (modalInfo.type) {
        case 'deleteProject':
            if (!activeProject) return null;
            return <Modal title={t('modals.delete_project.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.delete_project.confirm', { projectName: activeProject.projectName })}</p>
                  <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                      <button className="btn-danger" onClick={() => executeDeleteProject(activeProject.id)}>{t('modals.delete_project.confirm_button')}</button>
                  </div>
            </Modal>;

        case 'confirmResetProject':
            if (!activeProject) return null;
            return <Modal title={t('modals.reset_project.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.reset_project.confirm', { projectName: activeProject.projectName })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={executeResetProject}>{t('modals.reset_project.confirm_button')}</button>
                </div>
            </Modal>;

        case 'cannotDeleteLastProject':
            return <Modal title={t('modals.cannot_delete_last.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.cannot_delete_last.text')}</p>
                <div className="modal-actions">
                    <button className="btn-primary" onClick={() => setModalInfo(null)}>{t('common.ok')}</button>
                </div>
            </Modal>;

        case 'importConflict':
           const { newProject: np, existingProject: ep } = modalInfo;
            return <Modal title={t('modals.import_conflict.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.import_conflict.text', { projectName: np.projectName || (np as any).name })}</p>
                <div className="modal-warning">
                    <strong>{t('modals.import_conflict.existing')}</strong> {ep.createdAt ? new Date(ep.createdAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US') : t('modals.import_conflict.unknown')}<br/>
                    <strong>{t('modals.import_conflict.imported')}</strong> {np.createdAt ? new Date(np.createdAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US') : t('modals.import_conflict.unknown')}
                </div>
                <p>{t('modals.import_conflict.question')}</p>
                <div className="modal-actions-stacked">
                    <button className="btn-primary" onClick={() => setModalInfo({type: 'finalOverwriteConfirm', newProject: np, existingProject: ep})}>{t('modals.import_conflict.overwrite')}</button>
                    <button className="btn-secondary" onClick={() => handleImportAsCopy(np)}>{t('modals.import_conflict.copy')}</button>
                    <button className="btn-link" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                </div>
            </Modal>;

        case 'finalOverwriteConfirm':
             const { newProject: np_c, existingProject: ep_c } = modalInfo;
             return <Modal title={t('modals.overwrite_confirm.title')} onClose={() => setModalInfo(null)}>
                 <p>{t('modals.overwrite_confirm.text', { projectName: ep_c.projectName })}</p>
                 <div className="modal-actions">
                     <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                     <button className="btn-danger" onClick={() => handleImportOverwrite(ep_c, np_c)}>{t('modals.overwrite_confirm.confirm_button')}</button>
                 </div>
             </Modal>;
        
        case 'confirmNewProjectImport':
             const { newProject: np_i } = modalInfo;
             return <Modal title={t('modals.import_confirm.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.import_confirm.text', { projectName: np_i.projectName || (np_i as any).name })}</p>
                 <div className="modal-actions">
                     <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                     <button className="btn-primary" onClick={() => handleImportAsCopy(np_i)}>{t('modals.import_confirm.confirm_button')}</button>
                 </div>
             </Modal>;

        case 'print':
            return <PrintModal onClose={() => setModalInfo(null)} plansToPrint={plansToPrint} setPlansToPrint={setPlansToPrint} />;

        case 'sendEmail':
            return <SendEmailModal onClose={() => setModalInfo(null)} activeProject={activeProject} aiSettings={aiSettings} setNotification={setNotification} />;

        case 'confirmSwitchProject':
            return <Modal title={t('modals.unsaved_changes.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.unsaved_changes.switch_text')}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={() => executeSwitchProject(modalInfo.projectId)}>{t('modals.unsaved_changes.switch_button')}</button>
                </div>
            </Modal>;
        
        case 'confirmNewProjectUnsaved':
            return <Modal title={t('modals.unsaved_changes.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.unsaved_changes.new_project_text')}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                    <button className="btn-primary" onClick={executeNewProject}>{t('modals.unsaved_changes.new_project_button')}</button>
                </div>
            </Modal>;

        case 'confirmRestore':
            const { entry } = modalInfo;
            return <Modal title={t('modals.restore.title')} onClose={() => setModalInfo(null)}>
                <p>{t('modals.restore.confirm', { date: new Date(entry.timestamp).toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US') })}</p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setModalInfo(null)}>{t('common.cancel')}</button>
                    <button className="btn-danger" onClick={() => executeRestore(entry)}>{t('modals.restore.confirm_button')}</button>
                </div>
            </Modal>;
            
        case 'error':
            return <Modal title={modalInfo.title} hideTitle={true} onClose={() => setModalInfo(null)}>
                <div className="modal-icon-header">
                    <div className="icon-wrapper error">
                        <Icon icon="warning" size={24} />
                    </div>
                    <h2>{modalInfo.title}</h2>
                </div>
                <p>{modalInfo.message}</p>
                <div className="modal-actions">
                    <button className="btn-primary" onClick={() => setModalInfo(null)}>{t('common.close')}</button>
                </div>
            </Modal>;

        default:
            return null;
    }
};
