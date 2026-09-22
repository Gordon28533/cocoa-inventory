const APP = 'https://cocoa-inventory.vercel.app';
const API = 'https://cocoa-inventory-backend.onrender.com';
(async () => {
  const t0 = Date.now();
  const api = await fetch(API + '/items');
  console.log('backend /items (no token):', api.status, (Date.now()-t0)+'ms');

  const html = await (await fetch(APP)).text();
  const srcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  console.log('frontend bundles found:', srcs.length);
  let found = { requester: false, requestedBy: false, staffId: false };
  for (const s of srcs) {
    const js = await (await fetch(APP + s)).text();
    if (js.includes('approval-card__requester')) found.requester = true;
    if (js.includes('Requested By')) found.requestedBy = true;
    if (js.includes('requested_by_staff_id')) found.staffId = true;
  }
  console.log('deployed bundle contains:');
  console.log('   approval-card__requester   :', found.requester);
  console.log('   \"Requested By\" CSV header  :', found.requestedBy);
  console.log('   requested_by_staff_id      :', found.staffId);
})();
