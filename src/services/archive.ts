import JSZip from 'jszip';
import { VaultItem, EncryptedFileAttachment } from '../types';

export interface MonthlyArchiveResult {
  zipBlob: Blob;
  zipFileName: string;
  itemCount: number;
  attachmentCount: number;
  totalSizeBytes: number;
}

/**
 * Builds a clean, organized ZIP archive containing:
 * 1. credentials.csv (All logins, cards, IDs, notes)
 * 2. credentials_spreadsheet.xls (Excel XML Spreadsheet)
 * 3. summary_report.md (Markdown overview & index)
 * 4. documents/ (All decrypted file attachments, categorized and decoded)
 */
export async function generateMonthlyArchiveZip(
  items: VaultItem[], 
  recipientEmail: string
): Promise<MonthlyArchiveResult> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];
  const zipFileName = `personal-vault-monthly-archive-${dateStr}.zip`;

  // 1. Build CSV Content
  const headers = [
    'ID', 'Category', 'Title', 'Username', 'Password / Secret', 'URL', 'Expiry Date',
    'TOTP Secret', 'Cardholder', 'Card Number', 'Card Expiry', 'CVV',
    'Doc Type', 'Doc Number', 'Full Name', 'ID/Tax Number', 'Favorite', 'Tags', 'Notes'
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map((item) => {
    const isLogin = item.category === 'login';
    const isCard = item.category === 'card';
    const isDoc = item.category === 'document';
    const isId = item.category === 'identity';
    const isNote = item.category === 'note';

    return [
      escapeCSV(item.id),
      escapeCSV(item.category),
      escapeCSV(item.title),
      escapeCSV(isLogin ? (item as any).username || '' : ''),
      escapeCSV(isLogin ? (item as any).password || '' : isNote ? (item as any).content || '' : ''),
      escapeCSV(isLogin ? (item as any).url || '' : ''),
      escapeCSV(item.expiresAt || (item as any).expiryDate || ''),
      escapeCSV(isLogin ? (item as any).totpSecret || '' : ''),
      escapeCSV(isCard ? (item as any).cardholderName || '' : ''),
      escapeCSV(isCard ? (item as any).cardNumber || '' : ''),
      escapeCSV(isCard && (item as any).expiryYear ? `${(item as any).expiryMonth || '01'}/${(item as any).expiryYear}` : ''),
      escapeCSV(isCard ? (item as any).cvv || '' : ''),
      escapeCSV(isDoc ? (item as any).docType || '' : ''),
      escapeCSV(isDoc ? (item as any).docNumber || '' : ''),
      escapeCSV(isId ? (item as any).fullName || '' : ''),
      escapeCSV(isId ? (item as any).idNumber || (item as any).taxNumber || '' : ''),
      escapeCSV(item.favorite ? 'Yes' : 'No'),
      escapeCSV(item.tags?.join(', ') || ''),
      escapeCSV(item.notes || '')
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  zip.file('credentials.csv', csvContent);

  // 2. Build Summary Markdown Report
  let mdReport = `# Personal Vault Monthly Archival Backup
**Generated on**: ${new Date().toUTCString()}  
**Target Recipient**: ${recipientEmail}  
**Total Stored Items**: ${items.length}  

---

## Breakdown by Category
- **Logins & Accounts**: ${items.filter(i => i.category === 'login').length}
- **Payment Cards**: ${items.filter(i => i.category === 'card').length}
- **Official Documents**: ${items.filter(i => i.category === 'document').length}
- **Personal Identities**: ${items.filter(i => i.category === 'identity').length}
- **Secure Notes**: ${items.filter(i => i.category === 'note').length}

---

## Vault Manifest
| Category | Title | Identifier | Expiry | Tags |
|---|---|---|---|---|
`;

  items.forEach((item) => {
    let identifier = '-';
    if (item.category === 'login') identifier = (item as any).username || (item as any).url || '-';
    else if (item.category === 'card') identifier = `**** ${(item as any).cardNumber?.slice(-4) || '****'}`;
    else if (item.category === 'document') identifier = (item as any).docNumber || '-';
    else if (item.category === 'identity') identifier = (item as any).fullName || '-';

    const expiry = item.expiresAt || (item as any).expiryDate || '-';
    const tags = item.tags?.join(', ') || '-';
    mdReport += `| ${item.category.toUpperCase()} | ${item.title} | ${identifier} | ${expiry} | ${tags} |\n`;
  });

  mdReport += `\n\n*Notice: This archive is generated for personal monthly offline storage and emergency backup recovery.*`;
  zip.file('README_VAULT_SUMMARY.md', mdReport);

  // 3. Process Decrypted Documents and Attachments
  const docsFolder = zip.folder('documents');
  let attachmentCount = 0;

  items.forEach((item) => {
    const attachments: EncryptedFileAttachment[] = (item as any).attachments || [];
    if (attachments.length > 0 && docsFolder) {
      const sanitizedTitle = item.title.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
      attachments.forEach((att, idx) => {
        attachmentCount++;
        try {
          // Convert Data URL back to binary
          if (att.dataUrl && att.dataUrl.includes('base64,')) {
            const base64Data = att.dataUrl.split('base64,')[1];
            const cleanName = att.name ? att.name.replace(/[^a-zA-Z0-9._\-]/g, '_') : `attachment_${idx + 1}.bin`;
            const filePath = `${item.category}_${sanitizedTitle}/${cleanName}`;
            docsFolder.file(filePath, base64Data, { base64: true });
          }
        } catch (e) {
          console.warn(`Could not attach file ${att.name}:`, e);
        }
      });
    }
  });

  // 4. Generate the ZIP Blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return {
    zipBlob,
    zipFileName,
    itemCount: items.length,
    attachmentCount,
    totalSizeBytes: zipBlob.size,
  };
}

/**
 * Dispatches monthly archive to the FastAPI / Express backend to send email via SMTP / Gmail API
 * Or downloads directly to disk
 */
export async function sendArchiveEmail(
  zipBlob: Blob, 
  zipFileName: string, 
  recipientEmail: string,
  itemCount: number,
  attachmentCount: number
): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData();
    formData.append('archiveZip', zipBlob, zipFileName);
    formData.append('recipientEmail', recipientEmail);
    formData.append('itemCount', String(itemCount));
    formData.append('attachmentCount', String(attachmentCount));

    const response = await fetch('/api/v1/vault/archive/dispatch', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || `Monthly archive dispatched successfully to ${recipientEmail}`,
    };
  } catch (err: any) {
    console.error('Email dispatch failed:', err);
    return {
      success: false,
      message: err.message || 'Could not connect to archive dispatch server.',
    };
  }
}
