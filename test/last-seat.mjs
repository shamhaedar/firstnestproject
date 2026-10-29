// اختبار آخر مقعد: N شباب بيقدّموا بنفس اللحظة على برنامج فيه مقعد واحد (برنامج "Last Seat Demo" من الـ seed)
// الاستخدام:  BASE=http://localhost:3000/api node test/last-seat.mjs
// ملاحظة: لازم LOGIN_THROTTLE_LIMIT بالـ .env يكون كبير (مثلاً 1000) لأن 20 تسجيل دخول من نفس الـ IP.
const BASE = process.env.BASE ?? 'http://localhost:3000/api';
const N = Number(process.env.N ?? 20);
const post = (path, body, token, form) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: form ?? JSON.stringify(body),
  });

const admin = await (await post('/auth/login', { email: 'admin@sanad.local', password: 'Admin@12345' })).json();
const list = await (await fetch(BASE + '/programs?search=Last Seat', { headers: { Authorization: `Bearer ${admin.access_token}` } })).json();
const program = list.data[0];
console.log(`Program "${program.title}" has ${program.availableSeats}/${program.totalSeats} seats`);

const tokens = [];
for (let i = 1; i <= N; i++) {
  const r = await (await post('/auth/login', { email: `youth${i}@sanad.local`, password: 'Youth@12345' })).json();
  tokens.push(r.access_token);
}

console.log(`Firing ${N} simultaneous applications...`);
const results = await Promise.all(
  tokens.map(async (t, i) => {
    const form = new FormData();
    form.append('programId', String(program.id));
    const res = await post('/applications', null, t, form);
    return { youth: i + 1, status: res.status, body: await res.json() };
  }),
);

const ok = results.filter((r) => r.status === 201);
const rejected = results.filter((r) => r.status === 409);
console.log(`\n✅ succeeded: ${ok.length}  ${ok.map((r) => 'youth' + r.youth).join(', ')}`);
console.log(`⛔ "no seats" (409): ${rejected.length}`);
console.log(`other: ${results.length - ok.length - rejected.length}`);
console.log('sample rejection:', rejected[0]?.body);

const after = await (await fetch(`${BASE}/programs/${program.id}`, { headers: { Authorization: `Bearer ${admin.access_token}` } })).json();
console.log(`\nSeats after: ${after.availableSeats}/${after.totalSeats}`);
console.log(ok.length === program.availableSeats && after.availableSeats === 0 ? 'PASS: no overbooking' : 'FAIL');
