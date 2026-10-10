// Product copy supplied in LANDING_PAGE_PRODUCT_BRIEF_FAQ.md.
export const faq = [
  [
    "Apa sebenarnya aplikasi ini?",
    "Aplikasi desktop untuk menjelajahi katalog game Steam yang didukung, mengaktifkan akses game yang tersedia, menambahkannya ke personal library, dan mengelolanya dari satu tempat.",
  ],
  [
    "Apakah ini toko game key?",
    "Tidak. Produk ini bukan toko key tradisional dan tidak menggunakan sistem redeem key satu per satu sebagai pengalaman utama.",
  ],
  [
    "Berapa game yang tersedia?",
    "Saat ini tersedia lebih dari 70.000 game Steam yang didukung, dan library terus bertambah. Halaman ini menampilkan delapan game pilihan sebagai preview katalog.",
  ],
  [
    "Bagaimana cara mencari game?",
    "Cari berdasarkan judul atau deskripsi di katalog, lalu gunakan filter kategori dan genre. Di Library, cari berdasarkan nama atau App ID dan urutkan berdasarkan nama atau terakhir ditambahkan.",
  ],
  [
    "Bagaimana cara menambahkan game ke library?",
    "Cari game yang tersedia, buka halaman game, aktifkan aksesnya, lalu tambahkan game tersebut ke personal library.",
  ],
  [
    "Apakah semua game Steam tersedia?",
    "Tidak selalu. Hanya game yang sudah tersedia dan didukung di katalog yang dapat digunakan.",
  ],
  [
    "Bagaimana kalau game yang saya cari belum tersedia?",
    "Kamu akan diundang ke channel Request Game di Discord. Sampaikan judul game di sana agar tim dapat meninjaunya. Tautan undangan tersedia nanti.",
  ],
  [
    "Apakah saya bisa melihat status request game?",
    "Perkembangan request akan disampaikan oleh tim melalui channel Discord. Undangan untuk bergabung tersedia nanti.",
  ],
  [
    "Apakah katalog akan terus bertambah?",
    "Ya. Game baru dan metadata katalog diperbarui secara berkala.",
  ],
  [
    "Apakah Steam tersedia sekarang?",
    "Ya. Steam tersedia sekarang dan menjadi platform utama yang didukung.",
  ],
  [
    "Apakah EA sudah tersedia?",
    "Belum. Dukungan EA masih dalam pengembangan dan saat ini berstatus Coming Soon.",
  ],
  [
    "Apakah Ubisoft sudah tersedia?",
    "Belum. Integrasi Ubisoft masih dalam pengembangan dan saat ini berstatus Coming Soon.",
  ],
  [
    "Bagaimana dengan Denuvo?",
    "Dukungan untuk judul tertentu yang terkait dengan Denuvo masih dalam pengembangan dan ditampilkan sebagai Coming Soon.",
  ],
  [
    "Apakah aplikasinya menggunakan subscription?",
    "Untuk Steam Access, model yang direncanakan adalah one-time purchase, bukan subscription bulanan. Harga dan tautan pembelian belum tersedia.",
  ],
  [
    "Apakah aplikasi mendapatkan update?",
    "Ya. Desktop application dan katalog dapat diperbarui secara berkala.",
  ],
  [
    "Bagaimana kalau saya mengalami masalah?",
    "Kamu akan diundang ke channel Support Center di Discord untuk mendapatkan bantuan dari tim. Tautan undangan tersedia nanti.",
  ],
  [
    "Masalah apa saja yang bisa dibantu oleh support?",
    "Support dapat menangani masalah account, application, activation, library, game issue, request game, dan masalah teknis lainnya.",
  ],
  [
    "Bagaimana saya mengikuti penanganan support?",
    "Lanjutkan percakapan dengan tim melalui channel support Discord untuk mengikuti penanganan masalahmu. Tautan undangan tersedia nanti.",
  ],
] as const;

export const requestStatuses = [
  "Join Discord",
  "Channel Request",
  "Review oleh tim",
];
export const supportCategories = [
  "Account",
  "Application",
  "Activation",
  "Game Issue",
  "Library",
  "Request Game",
  "Other",
];
export const ticketStatuses = [
  "Join Discord",
  "Channel Support",
  "Bantuan tim",
];

export const resourceInfo = {
  request: {
    title: "Request Game.",
    text: "Game belum tersedia? Kamu akan diundang ke channel Request Game di Discord untuk menyampaikan judul yang kamu cari. Tim akan meninjaunya untuk kemungkinan ditambahkan ke library. Tautan undangan Discord tersedia nanti.",
  },
  support: {
    title: "Support Center.",
    text: "Kamu akan diundang ke channel Support Center di Discord. Jelaskan kendala account, aplikasi, activation, library, atau game yang kamu alami, lalu tim akan membantu melalui channel tersebut. Tautan undangan Discord tersedia nanti.",
  },
  tutorial: {
    title: "Cari. Aktifkan. Mainkan.",
    text: "Jelajahi katalog di aplikasi desktop, buka game yang tersedia, aktifkan aksesnya, lalu tambahkan ke personal library. Kelola instalasi dan tindakan yang tersedia dari halaman game. Panduan lengkap akan ditambahkan setelah tersedia.",
  },
  status: {
    title: "Status platform.",
    text: "Steam — Available Now. EA, Ubisoft, dan dukungan terkait Denuvo — Coming Soon. Tautan unduhan desktop belum tersedia pada halaman ini dan akan diperbarui setelah siap.",
  },
  terms: {
    title: "Terms of Service.",
    text: "Dokumen ketentuan layanan belum tersedia dan akan ditambahkan setelah ditetapkan.",
  },
  refund: {
    title: "Refund Policy.",
    text: "Kebijakan refund belum tersedia dan akan ditambahkan bersama informasi pembelian Steam Access.",
  },
} as const;
