import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc, 
    orderBy, 
    query, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAm3ImhpEG11sWJ5EBEXYNL7kmI-PCKlo4",
    authDomain: "factur-5cd5b.firebaseapp.com",
    projectId: "factur-5cd5b",
    storageBucket: "factur-5cd5b.firebasestorage.app",
    messagingSenderId: "663552709274",
    appId: "1:663552709274:web:4fe4457222186f181a0523",
    measurementId: "G-1NS07947WN"
};

const db = getFirestore(initializeApp(firebaseConfig));
let globalHargaData = [];

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

window.addItemRow = function(nama = '', harga = '') {
    const div = document.createElement('div');
    div.className = "flex gap-2 item-row";
    div.innerHTML = `
        <input type="text" placeholder="Nama Barang" required class="flex-1 border p-2 rounded text-sm item-nama">
        <input type="number" placeholder="Harga" required class="w-32 border p-2 rounded text-sm item-harga">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500">✕</button>
    `;
    document.getElementById('itemRowsContainer').appendChild(div);
}

window.openHargaModal = () => { document.getElementById('hargaModal').classList.remove('hidden'); addItemRow(); }
window.closeHargaModal = () => { document.getElementById('hargaModal').classList.add('hidden'); document.getElementById('hargaForm').reset(); }

function renderTable() {
    const tbody = document.getElementById('tableHargaBody');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filter = document.getElementById('filterOutlet').value;
    tbody.innerHTML = '';

    globalHargaData.forEach(docItem => {
        // Filter outlet
        if (filter && docItem.outlet !== filter) return;

        // Cek apakah ada barang yang cocok dengan pencarian
        const itemsFiltered = docItem.items.filter(item => 
            item.nama.toLowerCase().includes(search) || 
            docItem.outlet.toLowerCase().includes(search)
        );

        if (itemsFiltered.length === 0) return;

        // Render baris pertama (dengan rowspan untuk Outlet dan Aksi)
        itemsFiltered.forEach((subItem, index) => {
            const hDasar = subItem.hargaDasar || 0;
            const hPajak = subItem.hargaPajak || 0;
            const tr = document.createElement('tr');
            tr.className = "border-b text-xs sm:text-sm hover:bg-gray-50";

            if (index === 0) {
                // Baris pertama: Tampilkan Outlet dan Tombol Hapus dengan rowspan
                tr.innerHTML = `
                    <td class="py-3 px-4 font-bold text-gray-900 border-r" rowspan="${itemsFiltered.length}">${docItem.outlet}</td>
                    <td class="py-3 px-4">${subItem.nama}</td>
                    <td class="py-3 px-4">${formatRupiah(hDasar)}</td>
                    <td class="py-3 px-4 font-bold text-emerald-600">${formatRupiah(hPajak)}</td>
                    <td class="py-3 px-4 text-center border-l" rowspan="${itemsFiltered.length}">
                        <button onclick="deleteHarga('${docItem.id}')" class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">Hapus Outlet</button>
                    </td>
                `;
            } else {
                // Baris berikutnya: Tanpa kolom Outlet dan Aksi
                tr.innerHTML = `
                    <td class="py-3 px-4">${subItem.nama}</td>
                    <td class="py-3 px-4">${formatRupiah(hDasar)}</td>
                    <td class="py-3 px-4 font-bold text-emerald-600">${formatRupiah(hPajak)}</td>
                `;
            }
            tbody.appendChild(tr);
        });
    });
}

onSnapshot(query(collection(db, 'daftarHarga'), orderBy('createdAt', 'desc')), (snap) => {
    globalHargaData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const select = document.getElementById('filterOutlet');
    const outlets = [...new Set(globalHargaData.map(i => i.outlet))];
    select.innerHTML = '<option value="">Semua Outlet</option>' + outlets.map(o => `<option value="${o}">${o}</option>`).join('');
    renderTable();
});

document.getElementById('hargaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = [...document.querySelectorAll('.item-row')].map(row => {
        const hDasar = Number(row.querySelector('.item-harga').value);
        return { 
            nama: row.querySelector('.item-nama').value, 
            hargaDasar: hDasar, 
            hargaPajak: Math.round(document.getElementById('inputSudahPajak').checked ? hDasar : hDasar * 1.11) 
        };
    });
    await addDoc(collection(db, 'daftarHarga'), { outlet: document.getElementById('inputOutlet').value, items, createdAt: serverTimestamp() });
    closeHargaModal();
});

window.deleteHarga = (id) => { if(confirm('Hapus data?')) deleteDoc(doc(db, 'daftarHarga', id)); }
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('filterOutlet').addEventListener('change', renderTable);