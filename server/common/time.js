// common/time.js

/** YYYY-MM-DD HH:mm(KST) 형식으로 변환 */
export function formatKstYmdHm(dateLike) {
    if (!dateLike) return null;
    const d = new Date(dateLike);

    const pad = (n) => String(n).padStart(2, '0');

    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
