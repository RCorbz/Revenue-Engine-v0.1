export const maskPII = (val: string) => {
    if (!val) return '';
    return val.length > 4 ? `${val.slice(0, 2)}***${val.slice(-2)}` : '****';
};
