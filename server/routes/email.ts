import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

router.post('/send-email', async (req: Request, res: Response) => {
    const { smtp, to, cc, bcc, subject, body, attachments } = req.body;

    console.log(`[EMAIL] Attempting to send email to: ${to}`);

    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
        console.error('[EMAIL] Missing SMTP configuration');
        return res.status(400).json({ error: 'Missing SMTP configuration' });
    }

    try {
        const port = typeof smtp.port === 'string' ? parseInt(smtp.port, 10) : smtp.port;
        
        console.log(`[EMAIL] Using SMTP: ${smtp.host}:${port} (Secure: ${smtp.secure})`);

        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: port,
            secure: smtp.secure,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
            // Add some timeout to avoid hanging
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
        });

        const mailOptions = {
            from: smtp.from || smtp.user,
            to,
            cc,
            bcc,
            subject,
            html: body,
            attachments: attachments?.map((att: { name: string; data: string; type: string }) => ({
                filename: att.name,
                content: Buffer.from(att.data, 'base64'),
                contentType: att.type
            }))
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL] Success! Message ID:', info.messageId);
        
        if (info.rejected && info.rejected.length > 0) {
            console.warn('[EMAIL] Some recipients were rejected:', info.rejected);
        }

        res.json({ 
            success: true, 
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
        });
    } catch (err: unknown) {
        console.error('[EMAIL] SMTP Error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Ensure we always return JSON even on error
        res.status(500).json({ 
            error: 'Failed to send email', 
            details: errorMessage,
            code: (err as any).code || 'UNKNOWN'
        });
    }
});

export default router;
