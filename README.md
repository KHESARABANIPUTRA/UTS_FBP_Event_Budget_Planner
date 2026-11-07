# Event Budget Planner

Aplikasi web interaktif untuk merencanakan anggaran acara (seminar, workshop, wisuda), dibuat dengan **Angular 20** sebagai tugas **UTS Framework Based Programming** di Jakarta Global University.

- **Nama:** KHESA RABANI PUTRA
- **NPM:** 092023090197
- **Dosen:** Halimatuz Zuhriyah, S.Kom., MIT

Pengguna menyusun kategori anggaran beserta item biayanya secara dinamis, dan aplikasi menghitung serta memvalidasi anggaran secara real-time. Seluruh data berada di memori browser; lapisan Model (backend/database) tidak digunakan sesuai ketentuan soal.

## Fitur

| Fitur | Keterangan |
|---|---|
| Kategori dinamis | Tambah, hapus pada indeks tertentu, urutkan naik/turun, duplikat (maksimal 8) |
| Item biaya bersarang | Nama, qty, harga per item di dalam kategori (maksimal 10 per kategori) |
| Alokasi persen | Total semua kategori harus tepat 100%; tersedia tombol Bagi Persen Rata |
| Validasi lintas-baris | Nama kategori unik, total persen 100%, batas jumlah baris, total item tidak melebihi kuota |
| Ringkasan real-time | Kuota, terpakai, sisa, dan status `ok` / `warn` / `over` per kategori |
| Visualisasi | Donut alokasi kuota dan bar terpakai vs kuota (SVG, tanpa library) |
| Template dan Reset | Memuat contoh data dan mengosongkan seluruh form |
| Ekspor | Unduh CSV atau JSON, atau cetak/simpan PDF |

## Penerapan Materi UTS

| Soal | Penerapan | Lokasi |
|---|---|---|
| 5.1 FormArray dan cross-validation | `FormArray` dinamis dua tingkat (append, `removeAt(index)`), validator `minMaxRows`, `uniqueName`, `percentTotal`, `quotaWithinBudget` | `budget-planner.component.ts`, `validators.ts` |
| 5.2 `*ngFor` lanjutan | Context variable `index`, `first`, `last`; `trackBy` kustom (`trackByCategory`, `trackByItem`, `trackBySummary`, `trackBySlice`); nested loop kategori dan item | `budget-planner.component.html`, `category-row.component.html` |
| 5.3 `*ngIf` dan UI state | Template branching `then` / `else` untuk Empty State vs Populated State; seluruh logika boolean kompleks berupa getter (`hasCategories`, `canAddCategory`, `canSubmit`, dan lainnya) | `budget-planner.component.ts` |

## Struktur Komponen

```
AppComponent
└── BudgetPlannerComponent        smart/container: memegang FormGroup dan semua handler
    ├── CategoryRowComponent      satu baris kategori + loop item bersarang
    ├── SummaryPanelComponent     tabel ringkasan real-time
    ├── BudgetChartComponent      donut dan bar chart
    └── EmptyStateComponent       tampilan saat belum ada kategori

ExportService                     utilitas sisi klien untuk membuat file CSV/JSON (Blob)
```

Alur data: parent ke child lewat `@Input`, child ke parent lewat `@Output` (EventEmitter). Mutasi struktur array hanya dilakukan oleh `BudgetPlannerComponent`.

## Cara Menjalankan

Prasyarat: **Node.js 20.19 atau lebih baru** dan npm.

```bash
npm install
npm start
```

Buka `http://localhost:4200` di browser.

Untuk build produksi:

```bash
npm run build
```

## Struktur Folder

```
src/
├── main.ts
├── styles.scss
└── app/
    ├── app.component.ts
    ├── validators.ts
    ├── export.service.ts
    ├── budget-planner/
    ├── category-row/
    ├── summary-panel/
    ├── budget-chart/
    └── empty-state/
```

## Skenario Pengujian Singkat

1. Klik **Muat Template**: empat kategori dan item bersarang tampil, total persen 100%.
2. Ubah persen sehingga total bukan 100: muncul pesan error dan tombol Simpan nonaktif.
3. Beri dua kategori nama yang sama (huruf besar/kecil diabaikan): muncul pesan duplikat.
4. Isi item melebihi kuota kategori: bar merah, status `over`, Simpan nonaktif.
5. Tambah kategori sampai 8: tombol **+ Kategori** dan **Duplikat** nonaktif.
6. Hapus kategori di tengah: penomoran dan ringkasan terhitung ulang.
7. Klik **Reset**: tampil Empty State.

Dokumentasi lengkap (use case, sequence diagram, arsitektur komponen, dan hasil uji) ada pada laporan UTS.
