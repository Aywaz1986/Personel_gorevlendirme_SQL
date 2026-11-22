const fs=require('fs');const d=require('docx');
const {Document,Packer,Paragraph,TextRun,ImageRun,HeadingLevel,AlignmentType,Table,TableRow,TableCell,WidthType,ShadingType,BorderStyle,LevelFormat,PageBreak,TableOfContents,Footer,PageNumber}=d;
const FONT="Calibri";
let FIG=0;const img=(n,c0,hh)=>{const cap="Şekil "+(++FIG)+" – "+c0;return [new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:120,after:60},keepNext:true,children:[new ImageRun({type:"png",data:fs.readFileSync(`shots/${n}.png`),transformation:{width:560,height:hh||373},altText:{title:cap,description:cap,name:n}})]}),
 new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:200},children:[new TextRun({text:cap,italics:true,size:18,color:"555555"})]})];};
const h1=t=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun(t)]});
const h2=t=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun(t)]});
const run=(t)=>{const parts=t.split(/(\*\*[^*]+\*\*)/);return parts.map(p=>p.startsWith("**")?new TextRun({text:p.slice(2,-2),bold:true}):new TextRun(p));};
const p=t=>new Paragraph({spacing:{after:120},children:run(t)});
const b=t=>new Paragraph({numbering:{reference:"bul",level:0},spacing:{after:60},children:run(t)});
const n=(t,ref="num1")=>new Paragraph({numbering:{reference:ref,level:0},spacing:{after:60},children:run(t)});
const note=(t,fill="FFF4D6")=>new Table({width:{size:9360,type:WidthType.DXA},columnWidths:[9360],rows:[new TableRow({children:[new TableCell({width:{size:9360,type:WidthType.DXA},shading:{fill,type:ShadingType.CLEAR,color:"auto"},margins:{top:100,bottom:100,left:160,right:160},children:[new Paragraph({children:run(t)})]})]})]});
const sp=()=>new Paragraph({spacing:{after:80},children:[]});
const tbl=(w,rows)=>new Table({width:{size:w.reduce((a,c)=>a+c,0),type:WidthType.DXA},columnWidths:w,rows:rows.map((r,i)=>new TableRow({tableHeader:i==0,children:r.map((c,j)=>new TableCell({width:{size:w[j],type:WidthType.DXA},margins:{top:70,bottom:70,left:110,right:110},shading:i==0?{fill:"1F3A5F",type:ShadingType.CLEAR,color:"auto"}:undefined,children:[new Paragraph({children:[new TextRun({text:c,bold:i==0,color:i==0?"FFFFFF":undefined,size:20})]})]}))}))});
const C=[];
C.push(new Paragraph({spacing:{before:2400,after:200},alignment:AlignmentType.CENTER,children:[new TextRun({text:"Personel Görevlendirme",bold:true,size:52,color:"1F3A5F"})]}));
C.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:200},children:[new TextRun({text:"Resimli Kullanma Kılavuzu",size:34,color:"444444"})]}));
C.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:1200},children:[new TextRun({text:"SQL Server sürümü (Windows, tek exe) – Dilim 5: kimlik, roller, kadro, havuz, takvim, talep, atama",size:24,color:"666666"})]}));
C.push(note("**Bu kılavuzdaki ekran görüntüleri** uydurma örnek verilerle alınmıştır; gerçek personel verisi içermez. Gördüğünüz menüler yetkinize göre değişir. Kılavuz her dilimde güncellenir; henüz gelmemiş ekranlar (atama paneli, talep, haftalık matris, izin/rapor) ilgili dilimlerde eklenecektir.","E8F0FA"));
C.push(new Paragraph({children:[new PageBreak()]}));
C.push(new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun("İçindekiler")]}));
C.push(new TableOfContents("İçindekiler",{hyperlink:true,headingStyleRange:"1-2"}));
C.push(new Paragraph({children:[new PageBreak()]}));

C.push(h1("1. Uygulama nedir?"));
C.push(p("Personel Görevlendirme; personelin projelere görevlendirilmesini, görev taleplerini ve izlenmesini tek yerde yürüten Windows uygulamasıdır. Tek bir .exe dosyasıdır, kurulum gerekmez. Veriler Özlük ile aynı SQL Server veritabanında (SST_Ozluk), yalnızca `gorev` şemasında tutulur. Özlük verisine hiçbir şey yazılmaz; yalnızca kadro bilgisi okunur."));
C.push(h2("1.1 Roller"));
C.push(tbl([2300,7060],[["Rol","Ne yapar"],["Merkez Yönetici","Kadro eşitleme, bölüm–rol eşleştirme, kişi istisnaları, atama (sonraki dilimler)."],["Proje Sorumlusu","Görev talebi açar, değiştirir, geri çeker ve izler (Bölüm 8)."],["Saha Personeli","Kendi görevlerini izler, izin/rapor beyan eder (Dilim 7)."]]));
C.push(sp());
C.push(p("Rol, kişinin Özlük bölümünden gelir (Bölüm 4). Kişi bazlı istisna bölüm kuralının üzerine yazar. Birden fazla rolü olan kişi üst menüden **Görünüm** değiştirir; son seçim hatırlanır."));
C.push(note("**Bağlanabilmek yetki değildir.** Hesabınızın rolü çözülemiyorsa hiçbir veri görünmez ve “Yetkisiz Erişim” sayfası açılır."));

C.push(h1("2. Başlarken"));
C.push(n("Gorevlendirme.exe dosyasına çift tıklayın. Sunucu bağlantısı kayıtlıysa Windows kimliğinizle kendiliğinden bağlanır; değilse sunucu ve veritabanı adını yazıp **Bağlan**’a basın.","n2"));
C.push(n("Veritabanı şeması eski ya da kurulu değilse yalnızca **Sistem** sayfası açılır; yönetici (db_owner) **Şemayı kur / yükselt** der.","n2"));
C.push(n("İlk yönetici, SSMS’te `tools/sql/gorev_ilk_yonetici.sql` betiğiyle bir kez atanır (uygulama içinde “beni yönetici yap” düğmesi yoktur). Sonraki yöneticileri mevcut yönetici atar; sistemde her zaman en az bir aktif yönetici bulunur.","n2"));
C.push(p("Üst çubukta ortam rozeti görünür: **TEST** (geliştirme) ya da **CANLI**."));
C.push(...img("04_gorunum","Çoklu rolde üst menüden görünüm değiştirme."));

C.push(h1("3. Kadro (Merkez Yönetici)"));
C.push(p("Kadro Özlük’ten okunur; burada yalnızca beş alanlık kopyası tutulur (sicil, ad soyad, bölüm, telefon, kullanıcı adı, ayrılış). **Kadroyu Özlük’ten eşitle** düğmesi:"));
C.push(b("Yeni kişileri ekler, değişenleri günceller, Özlük’te artık görünmeyen ya da ayrılış tarihi geçmiş kişileri **pasife alır**; hiçbir kaydı silmez."));
C.push(b("Özlük’ten okunan satır sayısı mevcut aktif kadronun %80’inin altındaysa (ya da hiç satır yoksa) işlemi **iptal eder**: dar kapsamlı bir hesapla eşitleme yanlışlıkla herkesi pasife almasın."));
C.push(b("Özlük’te yönetici ya da tüm kurum kapsamlı (İK/görüntüleyici) bir hesapla çalıştırılmalıdır; aksi halde yetki hatası verir."));
C.push(...img("01_kadro","Kadro sayfası: eşitleme sonucu ve kadro kopyası."));

C.push(h1("4. Bölüm–rol eşleştirme"));
C.push(p("Eşitlemeden sonra Özlük bölümlerinin listesi hazırdır. Her bölüm için **Proje Sorumlusu** ya da **Saha Personeli** seçin; seçim anında kaydedilir. “Rol yok” seçmek eşleşmeyi kaldırır. Eşleşmesi olmayan bölümdeki kişiler hiçbir şey göremez (uyarı satırında görünür). Merkez Yönetici rolü bölümden gelmez; yalnızca istisna ile verilir."));
C.push(...img("02_eslestirme","Bölüm–rol eşleştirme."));

C.push(h1("5. Kişi istisnaları"));
C.push(p("Kadrodan bir kişi seçip Windows hesabına açıkça rol verirsiniz (Merkez Yönetici, Proje Sorumlusu, Saha Personeli birlikte işaretlenebilir). Aktif istisna varsa kişinin rolleri tam olarak bu işaretlerdir; bölüm kuralına bakılmaz. Pasife alınan istisna rol vermez."));
C.push(note("**Son aktif yönetici** kaldırılamaz, silinemez, pasife alınamaz: işlem sunucuda reddedilir (“en az bir aktif Merkez Yönetici bulunmalı”)."));
C.push(...img("03_istisna","Kişi istisnaları."));

C.push(h1("6. Proje havuzu"));
C.push(p("Görev talepleri bu havuzdan seçilir. Havuz dört seviyelidir: **Ana Proje › Alt Proje › Faaliyet › Konum**. Yalnızca Merkez Yönetici düzenler; rolü olan herkes okur."));
C.push(b("**Ekle:** üstteki kutudan Ana Proje, satırdaki **+ Alt Proje / + Faaliyet / + Konum** düğmesiyle alt kayıt eklenir. Aynı üstte aynı ad (büyük/küçük harf fark etmez) iki kez olamaz. Konum seviyesinin altına kayıt eklenemez."));
C.push(b("**Ad değiştir:** satırdaki düğmeyle."));
C.push(b("**Pasife al / Etkinleştir:** pasife alınan kaydın altındakiler de pasife alınır; etkinleştirmek için üst kaydın aktif olması gerekir. Pasifleri görmek için “Pasifleri göster” işaretlenir."));
C.push(b("**Birleştir…:** aynı seviyedeki iki kayıt birleştirilir (örn. aynı projenin iki farklı yazılışı). Kaynağın altındakiler hedefe taşınır, aynı adlılar kendi içinde birleşir. Kaynak silinmez; “Birleştirildi” rozetiyle pasif kalır ve hedefi gösterir. İşlem geri alınamaz."));
C.push(...img("06_havuz","Proje havuzu ağacı."));

C.push(h1("7. Akademik takvim"));
C.push(p("Resmi ve idari tatil günleri tutulur. Her kayıt bir **başlangıç** ve isteğe bağlı **bitiş** tarihi (boşsa tek gün), bir **zaman dilimi** (Tüm gün, Öğleden önce ÖÖ, Öğleden sonra ÖS), bir **tür** (Resmi tatil, İdari tatil), bir ad ve **Yıllık izinden kesilir** işareti içerir. Yarım gün yalnız tek günde olur; bir kayıt tek yıl içinde ve 60 günden kısa olmalıdır. Aynı güne “Tüm gün” ile yarım gün birlikte girilemez; ÖÖ + ÖS birlikte girilebilir."));
C.push(note("**Tatil gününe atama engellenmez.** Atama ekranı (sonraki dilim) tatil gününe atama yapılırken yöneticiyi uyarır; karar yöneticinindir. Yıllık izin hesabı bu sürümde yoktur: “Yıllık izinden kesilecek” toplamı yalnız bilgidir."));
C.push(h2("7.1 Yıl görünümü"));
C.push(p("Sayfanın üstünde yıl seçilir. Özet kutuları o yılın resmi tatil gününü, idari tatil gününü ve yıllık izinden kesilecek iş gününü gösterir. Altında 12 aylık yıl takvimi vardır: mavi **resmi**, turuncu **idari** tatil, daire **yarım gün**, gri hafta sonudur; soldaki HFT sütunu ISO hafta numarasıdır. Kayıtlar listesinde her tatil “10.04.2024 – 12.04.2024 · 3 gün” biçiminde görünür."));
C.push(h2("7.2 Tek tek ekleme"));
C.push(p("Formda başlangıç (ve çok günlüyse bitiş) tarihini, zaman dilimini, türü ve adı girip **Kaydet**’e basın. Bayram gibi ardışık günler tek kayıttır. Listedeki **Düzenle** / **Sil** düğmeleri seçili yıla aittir."));
C.push(h2("7.3 Toplu yükleme"));
C.push(n("**Standart takvim dosyası:** resmi takvim tablosunu (ör. 2024_Takvim.xlsx) **.xlsx** olarak seçin ya da altındaki liste satırlarını (“10-11-12 NİSAN Çarşamba-Perşembe-Cuma / 3 Gün Ramazan Bayramı”) kutuya yapıştırın. Yıl, sayfadaki 20xx hücresinden alınır; yoksa seçili yıl kullanılır. “YILLIK İZİNDEN KESİLECEK” yazan satırlar idari tatil ve yıllık izinden kesilir olarak okunur; “½ Gün” yarım gün (ÖS) olur.","n7"));
C.push(n("**Sütunlu dosya:** Başlangıç; Bitiş; Ad; Tür; Zaman dilimi; Yıllık sırasıyla (CSV, Excel’den yapıştırma ya da .xlsx). İlk satır başlık olabilir.","n7"));
C.push(n("**Önizle**’ye basın. Her satır Yeni, Güncellenecek, Aynı ya da Hata olarak görünür; bu aşamada hiçbir şey kaydedilmez.","n7"));
C.push(n("Hata yoksa **Uygula**. Hatalı satır varsa hiçbiri uygulanmaz: hatayı düzeltip yeniden önizleyin.","n7"));
C.push(...img("07_takvim","Akademik takvim: yıl görünümü, kayıtlar, form ve toplu yükleme önizlemesi.",1073));

C.push(h1("8. Görev talebi (Proje Sorumlusu)"));
C.push(p("Proje Sorumlusu menüde **Görev Talep Arayüzü**'nü görür; Merkez Yönetici aynı ekranı **Talepler** adıyla görür ve tüm talepleri izler, talepleri vekâleten açabilir."));
C.push(h2("8.1 Taleplerim listesi"));
C.push(p("Her talep bir kart olarak görünür: kod (TLP-NNNN), tarih aralığı, mesai saati, proje yolu, konum, önerilen personel, gün ve kişi-gün sayısı ve **durum rozeti**. Üstteki düğmelerle Bekleyen / Atanmış / Kapalı süzülür."));
C.push(tbl([2400,6960],[["Rozet","Anlamı"],["Taslak","Kaydedildi, henüz gönderilmedi; serbestçe değiştirilir."],["Onay bekliyor","Gönderildi; Yönetici henüz karar vermedi. Revize ve geri çekme serbesttir."],["Kısmen / Tamamen atandı","Atama başladı (Yönetici atama ekranı sonraki dilimde gelir)."],["Reddedildi, Geri çekildi, İptal","Kapalı talep; yalnızca **Kopyala** yapılabilir."]]));
C.push(...img("08_talep_liste","Taleplerim: durum rozetleri, Kopyala / Revize / Geri çek.",560));
C.push(h2("8.2 Yeni talep"));
C.push(n("**Yeni talep**'e basın. **1. Talep sahibi (Proje Sorumlusu):** Windows oturumunuzdan otomatik gelir. Yönetici başkası adına (vekâleten) açıyorsa kutuya adın ilk harflerini yazıp listeden talep sahibini seçer.","n8"));
C.push(n("**2. Proje ve görev tanımı:** Ana Proje, Alt Proje, Faaliyet ve Konum açılır listelerden (ComboBox) seçilir; üstteki seçim alttakileri daraltır. Listede yoksa **➕ Listede yok, yeni yaz…** seçilip ad elle yazılır; talep gönderilince yeni ad otomatik olarak listeye eklenir (**Listeden seç** ile geri dönülür). Altında görev metni ve isteğe bağlı aranan nitelik yazılır.","n8"));
C.push(n("**3. Gün ve zaman dilimi:** başlangıç ve bitiş tarihini **GG.AA.YYYY** biçiminde yazın (noktalar kendiliğinden gelir); mesai saati varsayılan 07:30–16:35'tir. Günler kendiliğinden listelenir; hafta sonları ve akademik takvimdeki tam gün tatiller atlanır (not düşülür). Her gün için **Tam gün / Öğleden önce / Öğleden sonra** düğmesine basın, kişi sayısını − / + ile ayarlayın; ✕ günü kaldırır, **Tek gün ekle** listede olmayan günü ekler. “Günlük kişi” kutusu tüm günlerin kişi sayısını birlikte değiştirir.","n8"));
C.push(n("**4. Önerilen personel (isteğe bağlı):** adın ilk harflerini yazıp çıkan kişiye basın. Öneri bağlayıcı değildir; atamayı Merkez Yönetici yapar.","n8"));
C.push(p("Sağdaki (dar pencerede en alttaki) **Özet** kartı yazdıkça güncellenir; etiket ve değer yan yana görünür: 📍 Konum, 🕣 Saat, 📅 Tarih (gün sayısıyla), 📑 Proje, 📡 Faaliyet, 🙋‍♀️ Önerilen Personel, 🧍‍♂️ Proje sorumlusu. Gönder ve Taslak düğmeleri de bu kartın içindedir; altında kısa **Kurallar** notu vardır."));
C.push(n("**Talebi gönder** (Onay bekliyor olur) ya da **Taslak olarak kaydet** deyin. Hafta sonu ya da tatile denk gelen gün varsa kayıt yine yapılır, ekranda uyarı görünür.","n8"));
C.push(...img("09_talep_form","Yeni görev talebi formu.",1700));
C.push(note("**Revize, Kopyala, Geri çek.** Taslak ve onay bekleyen talepte **Revize** formu mevcut bilgilerle açar. **Kopyala** aynı bilgilerle yeni bir form açar (günler boş gelir). **Geri çek** talebi kapatır. Onaylanmış talepte revize ve iptal sonraki dilimde gelir. Yönetici talep sahibini formun başındaki listeden seçerek başka bir Sorumlu adına talep açabilir."));

C.push(h2("8.3 Atama paneli (Yönetici)"));
C.push(p("Onay bekleyen ya da kısmen atanmış talebin kartındaki **Ata** düğmesi atama panelini açar. Solda her gün/dilim için **atanan / istenen** görülür, altta adaylar, sağda talep özeti ve **Karar** kartı bulunur."));
C.push(n("Soldaki tabloda atama yapmak istediğiniz satırları işaretleyin (dolu satırlar seçilemez).","n8"));
C.push(n("Adaylar listesinde **Önerilen** kişi ve o Ana Projede daha önce çalışanlar üsttedir; çakışması olana “Çakışma: N gün”, olmayana “Müsait” yazar. Adın yanındaki **Seçili günlere ata** düğmesi kişiyi işaretli satırlara bekleme listesine ekler (Karar kartında görünür, × ile çıkarılır).","n8"));
C.push(n("**Atamayı onayla**'ya basın. Kısmi atama serbesttir: talep **Kısmen atandı** olur; istenen sayıya ulaşılınca **Tamamen atandı**.","n8"));
C.push(...img("10_atama_paneli","Atama paneli: gün/dilim tablosu, adaylar, talep özeti ve karar kartı.",1250));
C.push(note("**Çakışma kararı.** Seçilen kişi aynı gün (tam gün ya da örtüşen dilim) başka bir görevdeyse sistem kendi başına karar vermez; çakışan görev ve sorumlusu gösterilir. **Vazgeç** hiçbir şey yazmaz. **Çakışan görevden çıkar ve bu göreve ata** çakışan atamayı çıkarır, o talebin sorumlusuna bildirim gider ve işlem denetim kaydına yazılır. Öğleden önce ile öğleden sonra birbirini çakıştırmaz. İzin ve rapor çakışmasında çıkarma seçeneği olmayacaktır (atama reddedilir; sonraki dilim)."));
C.push(note("**Reddetme.** Onay bekleyen talepte **Reddet…** ile ret nedeni (zorunlu) yazılır; Sorumlu kartında nedeni ve bir bildirim görür. Atama başlamış talep reddedilemez."));
C.push(note("**Sorumlu tarafı.** Taleplerim sayfasının üstünde yeni bildirimler görünür (atandı, reddedildi, görevden çıkarıldı); **Tümünü okundu say** ile kapanır. Atama yapılmış talepte **Atananlar** düğmesi gün gün kimin atandığını gösterir."));

C.push(h2("8.4 Haftalık matris (herkes)"));
C.push(p("**Haftalık matris** menüsü Yönetici, Proje Sorumlusu ve Saha personeli için açıktır; yalnız okunur. Satırlar personel, sütunlar haftanın yedi günüdür. Hücrenin üst yarısı öğleden önce, alt yarısı öğleden sonradır; tam gün görev tek blok olarak görünür. Renk Ana Projeyi gösterir, proje adı hücrede de yazılıdır."));
C.push(n("Haftayı **◀ ▶** ile değiştirin, **Bu hafta**'ya basın ya da kutuya tarihi **GG.AA.YYYY** yazın (o tarihin haftası açılır).","n8"));
C.push(n("**Ad ara**, **Bölüm** ve **Ana Proje** ile daraltın. **Yalnız bu hafta görevli olanlar** işaretini kaldırırsanız görevi olmayan aktif personel de listelenir.","n8"));
C.push(n("Bir göreve basınca altta talep kodu, Ana Proje › Alt Proje › Faaliyet, konum, saat ve proje sorumlusu açılır.","n8"));
C.push(n("**Excel'e aktar** kayıt penceresi açar; görünen hafta ve filtrelerle bir .xlsx dosyası yazar (her gün için “ÖÖ: … / ÖS: …” metni).","n8"));
C.push(...img("11_matris","Haftalık matris: ÖÖ/ÖS bölünmüş hücreler, filtreler ve ayrıntı kartı.",1500));
C.push(note("**Otomatik yenileme.** Ekran 30 saniyede bir haftanın atamalarında değişiklik olup olmadığına bakar; değişmişse tabloyu kendiliğinden tazeler (üstte “Son yenileme” saati görünür). Sarı sütun akademik takvimdeki tam gün tatildir. İzin ve rapor günleri sonraki dilimde bu tabloya eklenecektir."));

C.push(h2("8.5 İzin, rapor ve görevlerim"));
C.push(p("**Saha personeli** için menüde **Görevlerim**, **Proje Sorumlusu** ve **Yönetici** için **İzin ve rapor** sayfası bulunur. Saha sayfasının üstünde kendi görevleriniz (son 14 gün ve önümüzdeki 90 gün) listelenir."));
C.push(n("**İzin talebi:** tür, başlangıç ve bitiş tarihini **GG.AA.YYYY** yazın; tam gün ya da yalnız öğleden önce/sonra seçin; **Talebi gönder**. Hafta sonu ve tatiller varsayılan olarak atlanır. Talep Yönetici onayına gider; onaylanan günlere atama yapılamaz. Bekleyen talebi **Geri çek** ile iptal edebilirsiniz.","n8"));
C.push(n("**Rapor beyanı:** ilk/son günü yazın, **Evrak seç…** ile PDF, JPG ya da PNG dosyası (en fazla 10 MB) seçin, **Raporu kaydet**. Evrak zorunludur. Rapor izinden önceliklidir: aynı günlerdeki izin iptal olur; o günlerde göreviniz varsa görev durur ve Yönetici ikame için uyarılır.","n8"));
C.push(n("**Yönetici:** bekleyen izinleri **Onayla** ya da nedenle **Reddet…**; onaylı izni **Kısalt…** ya da geri çekebilir. Onay sırasında kişinin o günlerde görevi varsa **Çakışma kararı** kutusu çıkar: *Vazgeç* ya da *Çakışan görevden çıkar ve izni uygula*. **Vekaleten** kutusundan başka biri adına izin/rapor girilebilir (izin anında onaylanır).","n8"));
C.push(...img("12_izin_rapor","Görevlerim: kişisel görevler, izin talebi ve rapor beyanı.",1500));
C.push(note("**Matriste görünüm.** Haftalık matriste izin gri blok (kesikli çerçeve: onay bekliyor), rapor kırmızı blok olarak görünür; yarım gün izin yalnız ilgili yarıyı kaplar."));

C.push(h1("9. Yetkisiz erişim"));
C.push(p("Hesabınız kadroda yoksa, pasifse ya da hiçbir rolü çözülmediyse bu sayfa açılır. **Hesap adını kopyala** ile adınızı merkez yöneticisine iletin."));
C.push(...img("05_yetkisiz","Yetkisiz erişim sayfası."));

C.push(h1("10. Sık sorulan sorular"));
C.push(tbl([3300,6060],[["Sorun","Çözüm"],["Yetkisiz Erişim görüyorum","Hesabınız kadroda yok/pasif ya da bölümünüze rol eşleştirilmemiş; yöneticiye hesap adınızı iletin."],["Eşitleme “eksik okuma” diye iptal oldu","Özlük’te tüm kurum kapsamı olan bir hesapla çalıştırın."],["Eşitleme “Özlük yetkisi” hatası verdi","Hesabınız Özlük’te yönetici ya da tüm kurum kapsamlı İK/görüntüleyici değil."],["Kendi yöneticiliğimi kaldıramıyorum","Sistemde tek aktif yönetici sizsiniz; önce başka bir yönetici atayın."],["Takvim yüklemesi “Tarih okunamadı” diyor","Tarihi gg.aa.yyyy ya da yyyy-aa-gg yazın; Excel’de sütunu Tarih biçimine çevirin."],["Havuza aynı adı ekleyemiyorum","Aynı üstte aynı ad (pasif olsa da) vardır; pasifi etkinleştirin ya da birleştirin."]]));

C.push(h1("11. Sorun giderme (BT için)"));
C.push(b("**Bağlantı izni:** Özlük’teki `NT AUTHORITY\\Authenticated Users` girişi bağlanmayı sağlar; veriye erişimi `gorev` tablolarındaki kayıt belirler."));
C.push(b("**Şema sürümü:** `SELECT TOP 5 * FROM gorev.sema_surumleri ORDER BY surum DESC;`"));
C.push(b("**Özlük dokunulmazlığı:** `tools/sql/dbo_iz.sql` çıktısı kurulumdan önce ve sonra aynı olmalıdır."));
C.push(p("Hata bildirirken ekran görüntüsünü ve hata metnini birlikte iletin."));

const doc=new Document({
 features:{updateFields:true},creator:"Görevlendirme",title:"Personel Görevlendirme – Kullanma Kılavuzu",
 styles:{default:{document:{run:{font:FONT,size:22}}},paragraphStyles:[
  {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:FONT,size:34,bold:true,color:"1F3A5F"},paragraph:{spacing:{before:360,after:160},keepNext:true,outlineLevel:0}},
  {id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:FONT,size:26,bold:true,color:"2D5B8C"},paragraph:{spacing:{before:240,after:100},keepNext:true,outlineLevel:1}}]},
 numbering:{config:[{reference:"bul",levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]},
  ...["num1","n2","n3","n4","n5","n7","n8"].map(r=>({reference:r,levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}))]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1300,right:1273,bottom:1300,left:1273}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Personel Görevlendirme – Kullanma Kılavuzu   |   Sayfa ",size:18,color:"777777"}),new TextRun({children:[PageNumber.CURRENT],size:18,color:"777777"})]})]})},
  children:C}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("../../docs/Kullanma-Kilavuzu.docx",b);console.log("ok")});
