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
    "Game dapat dicari berdasarkan nama dan difilter menggunakan genre, kategori, publisher, tahun rilis, serta informasi lain yang tersedia di katalog.",
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
    "Gunakan fitur Request Game dari aplikasi. Tim akan meninjau game tersebut untuk kemungkinan ditambahkan ke library.",
  ],
  [
    "Apakah saya bisa melihat status request game?",
    "Ya. Request dapat memiliki status seperti Requested, Reviewing, Available, atau Rejected sesuai proses review.",
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
    "Gunakan Support Center di aplikasi untuk membuat tiket bantuan.",
  ],
  [
    "Masalah apa saja yang bisa dibantu oleh support?",
    "Support dapat menangani masalah account, application, activation, library, game issue, request game, dan masalah teknis lainnya.",
  ],
  [
    "Apakah saya bisa melihat status tiket support?",
    "Ya. Ticket dapat memiliki status seperti Open, In Progress, Resolved, dan Closed.",
  ],
] as const;

export const requestStatuses = [
  "Requested",
  "Reviewing",
  "Available",
  "Rejected",
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
export const ticketStatuses = ["Open", "In Progress", "Resolved", "Closed"];

export const resourceInfo = {
  request: {
    title: "Request Game.",
    text: "Cari judul melalui aplikasi desktop. Jika belum tersedia, gunakan Request Game agar tim dapat meninjaunya untuk ditambahkan ke library. Request dikirim dari aplikasi; landing ini menampilkan informasi fiturnya.",
  },
  support: {
    title: "Support Center.",
    text: "Buat tiket melalui Support Center di aplikasi desktop. Pilih kategori masalah, jelaskan kendala yang kamu alami, lalu ikuti status penanganannya. Tiket bantuan dikirim dari aplikasi.",
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
