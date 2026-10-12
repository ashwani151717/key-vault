export function formatValue(value) {
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value, null, 2);
}
export function formatTimestamp(value) {
    if (!value)
        return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return '—';
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
