import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

// BMADv6 Standard: AES-256-GCM for Application-Layer Encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export const encryptSensitiveData = (text: string, keyHex: string) => {
    const iv = randomBytes(IV_LENGTH);
    const key = Buffer.from(keyHex, 'hex');
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const maskPII = (val: string) => {
    if (!val) return '';
    return val.length > 4 ? `${val.slice(0, 2)}***${val.slice(-2)}` : '****';
};

export const decryptSensitiveData = (encryptedData: string, keyHex: string) => {
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = Buffer.from(keyHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return decipher.update(encrypted) + decipher.final('utf8');
};