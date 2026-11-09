// Groups the raw guest records (one per guest per episode) into one profile per guest.
// aliases: record name -> one or more canonical names (merges spelling variants, splits joint appearances).
// photos: canonical name -> image path (optional).
export function slugify(name) {
  return String(name).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function displayParts(name) {
  const [person, ...rest] = String(name).split(' / ');
  return {person: person.trim(), brand: rest.join(' / ').trim()};
}
export function initials(name) {
  const words = displayParts(name).person.split(/\s+/).map(w => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean);
  const letters = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return letters || String(name).trim().charAt(0).toUpperCase() || '?';
}
export function groupGuests(records, aliases = {}, photos = {}) {
  const map = new Map();
  for (const r of records) {
    for (const name of aliases[r.name] || [r.name]) {
      if (!map.has(name)) map.set(name, {name, slug: slugify(name), appearances: [], social: '', photo: photos[name] || ''});
      const g = map.get(name);
      if (!g.appearances.some(a => a.episode === r.episode)) g.appearances.push({episode: r.episode, videoId: r.videoId, title: r.episodeTitle});
      if (!g.social && r.social) g.social = r.social;
    }
  }
  return [...map.values()].map(g => {
    g.appearances.sort((a, b) => a.episode - b.episode);
    return {...g, first: g.appearances[0].episode, last: g.appearances[g.appearances.length - 1].episode};
  });
}
// Most appearances first; ties go to whoever appeared most recently. Hosts can be left off with `skip` (lowercase names).
export function topGuests(guests, count = 3, skip = []) {
  return guests.filter(g => !skip.includes(g.name.toLowerCase()))
    .sort((a, b) => b.appearances.length - a.appearances.length || b.last - a.last).slice(0, count);
}
