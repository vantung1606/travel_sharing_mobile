// Danh mục chuẩn 63 Tỉnh Thành Việt Nam theo 4 Vùng Miền
export interface ProvinceItem {
  id: string;
  name: string;
  region: 'north' | 'central' | 'highlands' | 'south';
  aliases: string[];
  highlight: string;
}

export const VIETNAM_REGIONS = [
  { id: 'all', label: 'Toàn quốc', badge: '63 tỉnh thành' },
  { id: 'north', label: 'Miền Bắc', badge: '25 tỉnh thành' },
  { id: 'central', label: 'Miền Trung', badge: '14 tỉnh thành' },
  { id: 'highlands', label: 'Tây Nguyên', badge: '5 tỉnh thành' },
  { id: 'south', label: 'Miền Nam', badge: '19 tỉnh thành' },
] as const;

export const VIETNAM_PROVINCES: ProvinceItem[] = [
  // MIỀN BẮC (25)
  { id: 'HN', name: 'Hà Nội', region: 'north', aliases: ['hà nội', 'ha noi', 'hanoi', 'thủ đô'], highlight: 'Hồ Gươm & Phố Cổ' },
  { id: 'HP', name: 'Hải Phòng', region: 'north', aliases: ['hải phòng', 'hai phong', 'cát bà', 'đồ sơn'], highlight: 'Đảo Cát Bà' },
  { id: 'QN', name: 'Quảng Ninh', region: 'north', aliases: ['quảng ninh', 'quang ninh', 'hạ long', 'ha long', 'cô tô'], highlight: 'Vịnh Hạ Long' },
  { id: 'HG', name: 'Hà Giang', region: 'north', aliases: ['hà giang', 'ha giang', 'mã pí lèng', 'đồng văn', 'lũng cú'], highlight: 'Đèo Mã Pí Lèng' },
  { id: 'LC', name: 'Lào Cai', region: 'north', aliases: ['lào cai', 'lao cai', 'sa pa', 'sapa', 'fansipan'], highlight: 'Thị xã Sa Pa' },
  { id: 'NB', name: 'Ninh Bình', region: 'north', aliases: ['ninh bình', 'ninh binh', 'tràng an', 'tam cốc', 'bái đính'], highlight: 'Quần thể Tràng An' },
  { id: 'CB', name: 'Cao Bằng', region: 'north', aliases: ['cao bằng', 'cao bang', 'bản giốc', 'pac bo'], highlight: 'Thác Bản Giốc' },
  { id: 'BK', name: 'Bắc Kạn', region: 'north', aliases: ['bắc kạn', 'bac kan', 'ba bể', 'ba be'], highlight: 'Hồ Ba Bể' },
  { id: 'TQ', name: 'Tuyên Quang', region: 'north', aliases: ['tuyên quang', 'tuyen quang', 'na hang'], highlight: 'Hồ Na Hang' },
  { id: 'YB', name: 'Yên Bái', region: 'north', aliases: ['yên bái', 'yen bai', 'mù cang chải', 'mu cang chai', 'thác bà'], highlight: 'Ruộng Mù Cang Chải' },
  { id: 'TN', name: 'Thái Nguyên', region: 'north', aliases: ['thái nguyên', 'thai nguyen', 'hồ núi cốc'], highlight: 'Đồi Chè Tân Cương' },
  { id: 'LS', name: 'Lạng Sơn', region: 'north', aliases: ['lạng sơn', 'lang son', 'mẫu sơn', 'mau son'], highlight: 'Đỉnh Mẫu Sơn' },
  { id: 'BG', name: 'Bắc Giang', region: 'north', aliases: ['bắc giang', 'bac giang', 'tây yên tử'], highlight: 'Khu Tây Yên Tử' },
  { id: 'PT', name: 'Phú Thọ', region: 'north', aliases: ['phú thọ', 'phu tho', 'đền hùng', 'xuân sơn'], highlight: 'Đền Hùng' },
  { id: 'VP', name: 'Vĩnh Phúc', region: 'north', aliases: ['vĩnh phúc', 'vinh phuc', 'tam đảo', 'tam dao'], highlight: 'Thị trấn Tam Đảo' },
  { id: 'BN', name: 'Bắc Ninh', region: 'north', aliases: ['bắc ninh', 'bac ninh', 'kinh bắc'], highlight: 'Chùa Dâu & Quan Họ' },
  { id: 'HD', name: 'Hải Dương', region: 'north', aliases: ['hải dương', 'hai duong', 'côn sơn', 'kiếp bạc'], highlight: 'Côn Sơn Kiếp Bạc' },
  { id: 'HY', name: 'Hưng Yên', region: 'north', aliases: ['hưng yên', 'hung yen', 'phố hiến'], highlight: 'Phố Hiến Cổ Kính' },
  { id: 'TB', name: 'Thái Bình', region: 'north', aliases: ['thái bình', 'thai binh', 'đồng châu', 'cồn vành'], highlight: 'Bãi Biển Cồn Vành' },
  { id: 'HNAM', name: 'Hà Nam', region: 'north', aliases: ['hà nam', 'ha nam', 'tam chúc', 'tam chuc'], highlight: 'Chùa Tam Chúc' },
  { id: 'ND', name: 'Nam Định', region: 'north', aliases: ['nam định', 'nam dinh', 'quất lâm', 'xuân thủy'], highlight: 'Nhà Thờ Đổ Hải Lý' },
  { id: 'DB', name: 'Điện Biên', region: 'north', aliases: ['điện biên', 'dien bien', 'mường thanh', 'a1'], highlight: 'Đồi A1 Lịch Sử' },
  { id: 'LCU', name: 'Lai Châu', region: 'north', aliases: ['lai châu', 'lai chau', 'ô quy hồ', 'sin suối hồ'], highlight: 'Đèo Ô Quy Hồ' },
  { id: 'SL', name: 'Sơn La', region: 'north', aliases: ['sơn la', 'son la', 'mộc châu', 'moc chau', 'tà xùa', 'ta xua'], highlight: 'Thiên Đường Tà Xùa' },
  { id: 'HB', name: 'Hòa Bình', region: 'north', aliases: ['hòa bình', 'hoa binh', 'mai châu', 'mai chau', 'thung nai'], highlight: 'Thung Lũng Mai Châu' },

  // MIỀN TRUNG (14)
  { id: 'DN', name: 'Đà Nẵng', region: 'central', aliases: ['đà nẵng', 'da nang', 'danang', 'bà nà', 'bana', 'ngũ hành sơn'], highlight: 'Cầu Vàng Bà Nà' },
  { id: 'TTH', name: 'Thừa Thiên Huế', region: 'central', aliases: ['thừa thiên huế', 'huế', 'hue', 'cố đô', 'sông hương', 'lăng cô'], highlight: 'Đại Nội Kinh Thành' },
  { id: 'QNA', name: 'Quảng Nam', region: 'central', aliases: ['quảng nam', 'quang nam', 'hội an', 'hoi an', 'mỹ sơn'], highlight: 'Phố Cổ Hội An' },
  { id: 'QT', name: 'Quảng Trị', region: 'central', aliases: ['quảng trị', 'quang tri', 'cửa tùng', 'thành cổ'], highlight: 'Địa Đạo Vịnh Mốc' },
  { id: 'QB', name: 'Quảng Bình', region: 'central', aliases: ['quảng bình', 'quang binh', 'phong nha', 'sơn đoòng', 'kẻ bàng'], highlight: 'Hang Sơn Đoòng' },
  { id: 'HT', name: 'Hà Tĩnh', region: 'central', aliases: ['hà tĩnh', 'ha tinh', 'thiên cầm', 'ngã ba đồng lộc'], highlight: 'Biển Thiên Cầm' },
  { id: 'NA', name: 'Nghệ An', region: 'central', aliases: ['nghệ an', 'nghe an', 'cửa lò', 'nam đàn', 'pù mát'], highlight: 'Bãi Biển Cửa Lò' },
  { id: 'TH', name: 'Thanh Hóa', region: 'central', aliases: ['thanh hóa', 'thanh hoa', 'sầm sơn', 'pù luông', 'pu luong'], highlight: 'Khu Bảo Tồn Pù Luông' },
  { id: 'QNG', name: 'Quảng Ngãi', region: 'central', aliases: ['quảng ngãi', 'quang ngai', 'lý sơn', 'ly son'], highlight: 'Đảo Ngọc Lý Sơn' },
  { id: 'BD', name: 'Bình Định', region: 'central', aliases: ['bình định', 'binh dinh', 'quy nhơn', 'quy nhon', 'kỳ co', 'eo gió'], highlight: 'Eo Gió Quy Nhơn' },
  { id: 'PY', name: 'Phú Yên', region: 'central', aliases: ['phú yên', 'phu yen', 'ghềnh đá đĩa', 'tuy hòa', 'mũi điện'], highlight: 'Ghềnh Đá Đĩa' },
  { id: 'KH', name: 'Khánh Hòa', region: 'central', aliases: ['khánh hòa', 'khanh hoa', 'nha trang', 'cam ranh', 'điệp sơn'], highlight: 'Vịnh Biển Nha Trang' },
  { id: 'NT', name: 'Ninh Thuận', region: 'central', aliases: ['ninh thuận', 'ninh thuan', 'vĩnh hy', 'phan rang', 'núi chúa'], highlight: 'Vịnh Vĩnh Hy' },
  { id: 'BTH', name: 'Bình Thuận', region: 'central', aliases: ['bình thuận', 'binh thuan', 'mũi né', 'mui ne', 'phan thiết', 'cù lao câu'], highlight: 'Đồi Cát Mũi Né' },

  // TÂY NGUYÊN (5)
  { id: 'LD', name: 'Lâm Đồng', region: 'highlands', aliases: ['lâm đồng', 'lam dong', 'đà lạt', 'da lat', 'dalat', 'bảo lộc'], highlight: 'Xứ Mộng Mơ Đà Lạt' },
  { id: 'DLK', name: 'Đắk Lắk', region: 'highlands', aliases: ['đắk lắk', 'dak lak', 'buôn ma thuột', 'bmt', 'hồ lắk', 'buôn đôn'], highlight: 'Thủ Phủ Cà Phê BMT' },
  { id: 'GL', name: 'Gia Lai', region: 'highlands', aliases: ['gia lai', 'pleiku', 'biển hồ', 'chư đăng ya'], highlight: 'Biển Hồ T’Nưng' },
  { id: 'KT', name: 'Kon Tum', region: 'highlands', aliases: ['kon tum', 'măng đen', 'mang den', 'ngọc hồi'], highlight: 'Xứ Lạnh Măng Đen' },
  { id: 'DKN', name: 'Đắk Nông', region: 'highlands', aliases: ['đắk nông', 'dak nong', 'tà đùng', 'ta dung'], highlight: 'Hồ Tà Đùng' },

  // MIỀN NAM & ĐBSCL (19)
  { id: 'SG', name: 'TP. Hồ Chí Minh', region: 'south', aliases: ['hồ chí minh', 'ho chi minh', 'sài gòn', 'sai gon', 'tphcm', 'hcm'], highlight: 'Phố Đi Bộ & Chợ Bến Thành' },
  { id: 'KG', name: 'Kiên Giang', region: 'south', aliases: ['kiên giang', 'kien giang', 'phú quốc', 'phu quoc', 'nam du', 'hà tiên'], highlight: 'Đảo Ngọc Phú Quốc' },
  { id: 'CT', name: 'Cần Thơ', region: 'south', aliases: ['cần thơ', 'can tho', 'cái răng', 'bến ninh kiều'], highlight: 'Chợ Nổi Cái Răng' },
  { id: 'VT', name: 'Bà Rịa - Vũng Tàu', region: 'south', aliases: ['bà rịa', 'vũng tàu', 'vung tau', 'côn đảo', 'con dao', 'hồ tràm'], highlight: 'Bãi Sau & Côn Đảo' },
  { id: 'AG', name: 'An Giang', region: 'south', aliases: ['an giang', 'châu đốc', 'trà sư', 'thất sơn', 'núi sam'], highlight: 'Rừng Tràm Trà Sư' },
  { id: 'DT', name: 'Đồng Tháp', region: 'south', aliases: ['đồng tháp', 'dong thap', 'sa đéc', 'tràm chim', 'sen hồng'], highlight: 'Làng Hoa Sa Đéc' },
  { id: 'TG', name: 'Tiền Giang', region: 'south', aliases: ['tiền giang', 'tien giang', 'mỹ tho', 'thới sơn', 'cái bè'], highlight: 'Cù Lao Thới Sơn' },
  { id: 'BTRE', name: 'Bến Tre', region: 'south', aliases: ['bến tre', 'ben tre', 'xứ dừa', 'châu thành'], highlight: 'Xứ Sở Dừa Bến Tre' },
  { id: 'VL', name: 'Vĩnh Long', region: 'south', aliases: ['vĩnh long', 'vinh long', 'an bình'], highlight: 'Cù Lao An Bình' },
  { id: 'TV', name: 'Trà Vinh', region: 'south', aliases: ['trà vinh', 'tra vinh', 'ba động', 'chùa hang'], highlight: 'Biển Ba Động' },
  { id: 'HG', name: 'Hậu Giang', region: 'south', aliases: ['hậu giang', 'hau giang', 'ngã bảy', 'lung ngọc hoàng'], highlight: 'Lung Ngọc Hoàng' },
  { id: 'ST', name: 'Sóc Trăng', region: 'south', aliases: ['sóc trăng', 'soc trang', 'chùa dơi', 'chùa chén kiểu'], highlight: 'Chùa Dơi Kỳ Bí' },
  { id: 'BL', name: 'Bạc Liêu', region: 'south', aliases: ['bạc liêu', 'bac lieu', 'công tử bạc liêu', 'điện gió'], highlight: 'Cánh Đồng Điện Gió' },
  { id: 'CM', name: 'Cà Mau', region: 'south', aliases: ['cà mau', 'ca mau', 'đất mũi', 'u minh hạ'], highlight: 'Mốc Tọa Độ Đất Mũi' },
  { id: 'BDG', name: 'Bình Dương', region: 'south', aliases: ['bình dương', 'binh duong', 'đại nam', 'dĩ an'], highlight: 'Khu DL Đại Nam' },
  { id: 'BP', name: 'Bình Phước', region: 'south', aliases: ['bình phước', 'binh phuoc', 'bù gia mập', 'núi bà rá'], highlight: 'Vườn QG Bù Gia Mập' },
  { id: 'TNINH', name: 'Tây Ninh', region: 'south', aliases: ['tây ninh', 'tay ninh', 'bà đen', 'ba den', 'tòa thánh'], highlight: 'Đỉnh Núi Bà Đen' },
  { id: 'DNAI', name: 'Đồng Nai', region: 'south', aliases: ['đồng nai', 'dong nai', 'cát tiên', 'bửu long', 'trị an'], highlight: 'Vườn QG Cát Tiên' },
  { id: 'LA', name: 'Long An', region: 'south', aliases: ['long an', 'tân lập', 'đồng tháp mười'], highlight: 'Làng Nổi Tân Lập' },
];
