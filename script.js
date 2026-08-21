import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc, 
    orderBy, 
    query, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
    apiKey: "AIzaSyAm3ImhpEG11sWJ5EBEXYNL7kmI-PCKlo4",
    authDomain: "factur-5cd5b.firebaseapp.com",
    projectId: "factur-5cd5b",
    storageBucket: "factur-5cd5b.firebasestorage.app",
    messagingSenderId: "663552709274",
    appId: "1:663552709274:web:4fe4457222186f181a0523",
    measurementId: "G-1NS07947WN"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let selectedInvoiceId = null;

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

// Fungsi Umum untuk Filter / Kolom Pencarian & Checkbox Status
function setupTableFilter(inputId, tableBodyId, checkboxId = null) {
    const input = document.getElementById(inputId);
    const tableBody = document.getElementById(tableBodyId);
    const checkbox = checkboxId ? document.getElementById(checkboxId) : null;

    if (!input || !tableBody) return;

    function applyFilter() {
        const filter = input.value.toLowerCase().replace(/[^0-9a-z]/g, '');
        const rawInput = input.value.toLowerCase();
        const onlyBelumBayar = checkbox ? checkbox.checked : false;
        
        const rows = tableBody.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const rowText = rows[i].textContent.toLowerCase();
            const cleanRowText = rowText.replace(/[^0-9a-z]/g, '');
            
            // Cek apakah baris memenuhi kriteria pencarian teks/angka
            const matchesSearch = cleanRowText.indexOf(filter) > -1 || rowText.indexOf(rawInput) > -1;
            
            // Cek apakah kriteria checkbox terpenuhi (jika dicentang, pastikan ada tulisan "Belum Bayar" di baris tersebut)
            const matchesCheckbox = !onlyBelumBayar || rowText.includes('belum bayar');

            if (matchesSearch && matchesCheckbox) {
                rows[i].style.display = "";
            } else {
                rows[i].style.display = "none";
            }
        }
    }

    input.addEventListener('input', applyFilter);
    if (checkbox) {
        checkbox.addEventListener('change', applyFilter);
    }
}
// ================= KONTROL HALAMAN CATATAN.HTML =================
if (document.getElementById('tableBody')) {
    window.openModal = function() {
        document.getElementById('addModal').classList.remove('hidden');
        document.getElementById('inputTgl').value = new Date().toISOString().split('T')[0];
    }

    window.closeModal = function() {
        document.getElementById('addModal').classList.add('hidden');
        document.getElementById('invoiceForm').reset();
    }

    window.openPayModal = function(id) {
        selectedInvoiceId = id;
        document.getElementById('payModal').classList.remove('hidden');
        document.getElementById('inputPayDate').value = new Date().toISOString().split('T')[0];
    }

    window.closePayModal = function() {
        document.getElementById('payModal').classList.add('hidden');
        selectedInvoiceId = null;
        document.getElementById('payForm').reset();
    }

    const qFaktur = query(collection(db, 'invoices'), orderBy('tgl', 'desc'));
    onSnapshot(qFaktur, (snapshot) => {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';

        let totalNilai = 0; 
        let totalFakturCount = snapshot.size;
        let invoicesArray = [];

        snapshot.forEach((docSnap) => {
            invoicesArray.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (invoicesArray.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-400">Belum ada data faktur.</td></tr>`;
        }

        invoicesArray.forEach((inv) => {
            const isLunas = inv.status === 'Sudah Bayar';
            const nilaiFaktur = Number(inv.nilai);

            let kurangPajak = (inv.pajak === 'ya') 
                ? nilaiFaktur - (nilaiFaktur * 0.11) - (nilaiFaktur * 0.015) 
                : nilaiFaktur;
        
            if (isLunas) {
                totalNilai += kurangPajak;
            }
        
            let statusBadge = isLunas 
                ? `<span class="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-green-100 text-green-700">Lunas (${inv.payDate || '-'})</span>`
                : `<span class="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-yellow-100 text-yellow-700">Belum Bayar</span>`;

            const row = document.createElement('tr');
            row.className = "text-xs sm:text-sm";
            row.innerHTML = `
                <td class="py-3 px-4 sm:px-6 font-medium">${inv.no}</td>
                <td class="py-3 px-4 sm:px-6">${inv.tgl}</td>
                <td class="py-3 px-4 sm:px-6">${inv.konsumen}</td>
                <td class="py-3 px-4 sm:px-6">${formatRupiah(nilaiFaktur)}</td>
                <td class="py-3 px-4 sm:px-6 font-semibold text-emerald-600">${formatRupiah(kurangPajak)}</td>
                <td class="py-3 px-4 sm:px-6 text-center">${statusBadge}</td>
                <td class="py-3 px-4 sm:px-6 text-center space-x-1 sm:space-x-2">
                    <button type="button" onclick="handlePaymentAction('${inv.id}', '${inv.status}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 text-[11px] sm:text-xs rounded transition cursor-pointer">
                        ${isLunas ? 'Batalkan' : 'Sudah Bayar'}
                    </button>
                    <button type="button" onclick="deleteInvoice('${inv.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 text-[11px] sm:text-xs rounded transition cursor-pointer">
                        Hapus
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.getElementById('totalRupiah').innerText = formatRupiah(totalNilai);
        document.getElementById('totalFaktur').innerText = totalFakturCount;

        // Aktifkan fitur pencarian untuk tabel faktur
        setupTableFilter('searchInput', 'tableBody', 'filterBelumBayar');
    });

    document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const no = document.getElementById('inputNo').value;
        const tgl = document.getElementById('inputTgl').value;
        const konsumen = document.getElementById('inputKonsumen').value;
        const nilai = Number(document.getElementById('inputNilai').value);
        const pakaiPajak = document.getElementById('inputPajak').value;
    
        try {
            await addDoc(collection(db, 'invoices'), {
                no,
                tgl,
                konsumen,
                nilai,
                pajak: pakaiPajak,
                status: 'Belum Bayar',
                payDate: null,
                createdAt: serverTimestamp()
            });
            closeModal();
        } catch (error) {
            alert("Gagal menambahkan data: " + error.message);
        }
    });

    window.handlePaymentAction = function(id, currentStatus) {
        if (currentStatus === 'Sudah Bayar') {
            updateDoc(doc(db, 'invoices', id), {
                status: 'Belum Bayar',
                payDate: null
            }).catch((error) => {
                alert("Gagal memperbarui status: " + error.message);
            });
        } else {
            openPayModal(id);
        }
    }

    document.getElementById('payForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payDate = document.getElementById('inputPayDate').value;

        if (selectedInvoiceId && payDate) {
            try {
                await updateDoc(doc(db, 'invoices', selectedInvoiceId), {
                    status: 'Sudah Bayar',
                    payDate: payDate
                });
                closePayModal();
            } catch (error) {
                alert("Gagal menyimpan tanggal bayar: " + error.message);
            }
        }
    });

    window.deleteInvoice = async function(id) {
        if (confirm('Apakah Anda yakin ingin menghapus faktur ini?')) {
            try {
                await deleteDoc(doc(db, 'invoices', id));
            } catch (error) {
                alert("Gagal menghapus data: " + error.message);
            }
        }
    }
}


// ================= KONTROL HALAMAN BARANG.HTML =================
if (document.getElementById('tableBarangBody')) {
    
    window.addItemRow = function(nama = '', jumlah = '') {
        const container = document.getElementById('itemRowsContainer');
        const rowDiv = document.createElement('div');
        rowDiv.className = "flex gap-2 items-center item-row";
        rowDiv.innerHTML = `
            <input type="text" placeholder="Nama Barang" value="${nama}" required class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 item-nama">
            <input type="number" placeholder="Jml" value="${jumlah}" required class="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 item-jumlah">
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-100 hover:bg-red-200 text-red-600 px-2.5 py-2 rounded-lg text-sm transition">✕</button>
        `;
        container.appendChild(rowDiv);
    }

    window.openBarangModal = function() {
        document.getElementById('barangModal').classList.remove('hidden');
        document.getElementById('inputTglKirim').value = new Date().toISOString().split('T')[0];
        document.getElementById('itemRowsContainer').innerHTML = '';
        addItemRow(); 
    }

    window.closeBarangModal = function() {
        document.getElementById('barangModal').classList.add('hidden');
        document.getElementById('barangForm').reset();
    }

    const qBarang = query(collection(db, 'barangTerkirim'), orderBy('tglKirim', 'desc'));
    onSnapshot(qBarang, (snapshot) => {
        const tableBarangBody = document.getElementById('tableBarangBody');
        tableBarangBody.innerHTML = '';

        let barangArray = [];
        snapshot.forEach((docSnap) => {
            barangArray.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (barangArray.length === 0) {
            tableBarangBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400">Belum ada data barang terkirim.</td></tr>`;
            return;
        }

        barangArray.forEach((item) => {
            if (item.items && Array.isArray(item.items)) {
                item.items.forEach((subItem, index) => {
                    const row = document.createElement('tr');
                    row.className = "text-xs sm:text-sm";
                    
                    const isFirst = index === 0;
                    const rowSpan = item.items.length;

                    row.innerHTML = `
                        ${isFirst ? `<td class="py-3 px-4 sm:px-6 font-medium" rowspan="${rowSpan}">${item.noSuratJalan}</td>` : ''}
                        ${isFirst ? `<td class="py-3 px-4 sm:px-6" rowspan="${rowSpan}">${item.tglKirim}</td>` : ''}
                        <td class="py-3 px-4 sm:px-6">${subItem.nama}</td>
                        <td class="py-3 px-4 sm:px-6 text-center font-semibold">${subItem.jumlah}</td>
                        ${isFirst ? `<td class="py-3 px-4 sm:px-6" rowspan="${rowSpan}">${item.konsumen}</td>` : ''}
                        ${isFirst ? `<td class="py-3 px-4 sm:px-6 text-center" rowspan="${rowSpan}">
                            <button type="button" onclick="deleteBarang('${item.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 text-[11px] sm:text-xs rounded transition cursor-pointer">
                                Hapus
                            </button>
                        </td>` : ''}
                    `;
                    tableBarangBody.appendChild(row);
                });
            }
        });

        // Aktifkan fitur pencarian untuk tabel barang
        setupTableFilter('searchInput', 'tableBarangBody');
    });

    document.getElementById('barangForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const noSuratJalan = document.getElementById('inputNoSJ').value;
        const tglKirim = document.getElementById('inputTglKirim').value;
        const konsumen = document.getElementById('inputKonsumenBarang').value;

        const itemRows = document.querySelectorAll('.item-row');
        let items = [];

        itemRows.forEach(row => {
            const nama = row.querySelector('.item-nama').value;
            const jumlah = Number(row.querySelector('.item-jumlah').value);
            if (nama) {
                items.push({ nama, jumlah });
            }
        });

        if (items.length === 0) {
            alert("Harap masukkan minimal satu nama barang.");
            return;
        }

        try {
            await addDoc(collection(db, 'barangTerkirim'), {
                noSuratJalan,
                tglKirim,
                konsumen,
                items,
                createdAt: serverTimestamp()
            });
            closeBarangModal();
        } catch (error) {
            alert("Gagal menambahkan barang terkirim: " + error.message);
        }
    });

    window.deleteBarang = async function(id) {
        if (confirm('Apakah Anda yakin ingin menghapus data surat jalan ini beserta seluruh barangnya?')) {
            try {
                await deleteDoc(doc(db, 'barangTerkirim', id));
            } catch (error) {
                alert("Gagal menghapus data: " + error.message);
            }
        }
    }
}