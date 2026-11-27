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
C.push(p("Rol, kişinin Özlük bölümünden gelir (Bölüm 4). Kişi bazlı istisna bölüm kuralının üzerine yazar. Birden fazla rolü olan kişide üst çubukta yalnız sahip olduğu rollerin düğmeleri görünür (yetkisiz roller tamamen gizlenir); son seçim hatırlanır."));
C.push(note("**Bağlanabilmek yetki değildir.** Hesabınızın rolü çözülemiyorsa hiçbir veri görünmez ve “Yetkisiz Erişim” sayfası açılır."));

C.push(h1("2. Başlarken"));
C.push(n("Gorevlendirme.exe dosyasına çift tıklayın. Bağlantı bilgisi exe’nin klasöründeki `Gorevlendirme.baglanti.json` dosyasından (yoksa aynı klasördeki Özlük’ün `Ozluk.baglanti.json` dosyasından) okunur ve Windows kimliğinizle **kendiliğinden** bağlanır; normal kullanıcı bağlantı penceresi görmez. Bağlantı ayarı yoksa ya da sunucuya ulaşılamıyorsa sade bir bilgi ekranı çıkar (**Yeniden dene**).","n2"));
C.push(n("Veritabanı şeması eski ya da kurulu değilse yalnızca **Sistem** sayfası açılır; yönetici (db_owner) **Şemayı kur / yükselt** der.","n2"));
C.push(n("İlk yönetici, SSMS’te `tools/sql/gorev_ilk_yonetici.sql` betiğiyle bir kez atanır (uygulama içinde “beni yönetici yap” düğmesi yoktur). Sonraki yöneticileri mevcut yönetici atar; sistemde her zaman en az bir aktif yönetici bulunur.","n2"));
C.push(p("Üst çubukta ortam rozeti görünür: **TEST** (geliştirme) ya da **CANLI**."));
C.push(...img("04_gorunum","Çoklu rolde üst menüden görünüm değiştirme."));
C.push(...img("20_baglanti_yok","Bağlantı ayarı yapılmamışsa gösterilen sade bilgi ekranı."));
C.push(h2("2.1 Bağlantı penceresi ve varsayılan bağlantı"));
C.push(p("Ekranın sol altında küçük bir **bağlantı penceresi** durur: durum, sürüm, kullanıcı, rol ve ortamı gösterir; **+** ile açılır, **↻/Yenile** verileri sunucudan yeniler. Başlığından sürüklenir, kenarlarından boyutlandırılır, başlığa çift tıklamak konumu sıfırlar. Sunucu ve veritabanı adı yalnızca Merkez Yönetici’ye görünür."));
C.push(p("**📌 İğne:** konumu kilitler. Yönetici iğnelediğinde konum **tüm kullanıcılar için varsayılan** olur (`Gorevlendirme.pencere.json`); iğne kaldırılınca bu varsayılan da kalkar."));
C.push(...img("18_baglanti_penceresi","Yüzen bağlantı penceresi (Yönetici görünümü)."));
C.push(p("**Yönetici:** pencerede **Bağlantıyı değiştir** ile form açılır. **“Varsayılan olarak kaydet”** işaretlenirse sunucu/veritabanı exe klasörüne yazılır ve herkes formu görmeden bağlanır (parola/kullanıcı adı saklanmaz). **Varsayılan bağlantıyı sil** dosyayı kaldırır. Klasör yazılamıyorsa (ör. Program Files) hata gösterilir; dosyayı BT elle koyabilir."));
C.push(...img("19_baglanti_formu","Bağlantı formu (yalnızca Yönetici)."));

C.push(note("**Ayarlar sekmesi:** Üst sekme şeridinde ayrı bir sekmedir. Görünüm ve yazı (tema, buzlu cam, yazı tipi/boyutu; her rolde açık), Kadro, Eski veri, Sistem ve İşlem Günlüğü alt sekmelerini içerir. Kullanıcı rolleri, yönetici tanımları ve işlem günlüğü artık **Kullanıcı Yetki** sekmesindedir; yeni yetkili **+ Yeni yetkili ekle** düğmesiyle (kullanıcılar alanının sağ üstü) eklenir."));
C.push(note("**Dilim 17 yenilikleri:** (1) Yönetici talep kartı 3 sütundur: Özet | Görev ve Saha Bilgisi (görev metni, saha notu, önerilen personel) | Ana Proje Bazlı Geçmiş Görev Tavsiye Bloğu. (2) **Revize & İkame Uyarıları** ayrı sekme değil, Talepler sayfasında 4. düğmedir (Kapalı 5. sıradadır). (3) Her **GG.AA.YYYY** kutusunun yanında 📅 düğmesi takvimden tarih seçtirir. (4) **Ayarlar › Görünüm ve yazı › Logo ve filigran:** logo seçilir (PNG/JPG/SVG/WebP, en çok 300 KB); sol üstte görünür, arka planda silik filigran olur; koyuluğu ayarlanır, yalnız bu bilgisayarda saklanır. (5) Kullanıcı Yetki sayfası alt alta tek sütundur: Yönetici tanımı ve kişi istisnaları, sonra Özlük bölüm adı → sistem rolü eşleştirme. İşlem günlüğü Ayarlar › İşlem Günlüğü sekmesindedir."));
C.push(...img("22_talep_ozet","Yönetici talep kartı: 3 sütunlu özet ekranı ve Revize & İkame Uyarıları düğmesi."));
C.push(...img("16_ayarlar_gorunum","Ayarlar: Görünüm ve yazı sekmesi ve Yönetici sekmeleri."));
C.push(h1("3. Kadro (Merkez Yönetici)"));
C.push(p("Kadro Özlük’ten okunur; burada yalnızca beş alanlık kopyası tutulur (sicil, ad soyad, bölüm, telefon, kullanıcı adı, ayrılış). **Kadroyu Özlük’ten eşitle** düğmesi:"));
C.push(b("Yeni kişileri ekler, değişenleri günceller, Özlük’te artık görünmeyen ya da ayrılış tarihi geçmiş kişileri **pasife alır**; hiçbir kaydı silmez."));
C.push(b("Özlük’ten okunan satır sayısı mevcut aktif kadronun %80’inin altındaysa (ya da hiç satır yoksa) işlemi **iptal eder**: dar kapsamlı bir hesapla eşitleme yanlışlıkla herkesi pasife almasın."));
C.push(b("Özlük’te yönetici ya da tüm kurum kapsamlı (İK/görüntüleyici) bir hesapla çalıştırılmalıdır; aksi halde yetki hatası verir."));
C.push(...img("01_kadro","Kadro sayfası: eşitleme sonucu ve kadro kopyası."));

C.push(h1("4. Kullanıcı Yetki Yönetimi: bölüm–rol eşleştirme ve kişi istisnaları"));
C.push(p("**Kullanıcı Yetki** sekmesi (yalnız Merkez Yönetici) iki bölümden oluşur; üstte 4 kart vardır: aktif Merkez Yönetici sayısı (en az 1 zorunlu), aktif istisna kaydı, eşleştirilmiş Özlük bölümü oranı ve kapsamdaki aktif personel."));
C.push(h2("4.1 Bölüm 1 — Yönetici tanımı ve kişi bazlı istisna roller"));
C.push(b("Kişi bazlı tanım **her zaman** bölüm eşleştirmesinin önündedir: kişinin rolleri yalnızca burada işaretlenenlerdir. Merkez Yönetici yalnız buradan atanır."));
C.push(b("**+ Yeni Yetki / İstisna Tanımla**: Özlük kadrosundan personel seçilir (ad yazılarak aranır), bölüm ve bölüm varsayılan rolü salt okunur görünür; roller kartlardan seçilir (birden fazla olabilir), **gerekçe zorunludur**. Birden fazla rol seçilirse kişi girişte üst menüde görünüm geçişi görür."));
C.push(b("Tabloda arama (ad, sicil, Windows kimliği, bölüm) ve süzgeç: Tümü / Merkez Yöneticiler / İstisna-Çoklu Roller / Pasifler. **● Aktif / ○ Pasif** düğmesi durumu değiştirir; **✎ Düzenle**, **🗑️ Kaldır** (kişi bölüm kuralına döner)."));
C.push(note("**Son aktif yönetici** kaldırılamaz, pasife alınamaz, yönetici rolü silinemez: satırda 🔒 Son Yönetici görünür, işlem sunucuda reddedilir ve kırmızı güvenlik bandı çıkar."));
C.push(...img("03_istisna","Kullanıcı Yetki: kartlar, kişi bazlı istisnalar ve bölüm eşleştirme.",1500));
C.push(...img("28_yetki_modal","Yeni yetki / istisna tanımlama penceresi."));
C.push(h2("4.2 Bölüm 2 — Özlük bölüm adı → varsayılan sistem rolü"));
C.push(b("Bölüm listesi kadro eşitlemesinden gelir (**🔄 Özlükten Güncelle** kadroyu Özlük'ten eşitler). Her bölüm için **Proje Sorumlusu**, **Saha Personeli** ya da **Kapsam Dışı (Erişimsiz)** seçilir. Henüz karar verilmemiş bölümler sarı bantla **Eşleşme Bekliyor** diye işaretlenir; bu bölümdeki kişiler (istisnası yoksa) hiçbir şey göremez."));
C.push(b("Seçimler hemen kaydedilmez: **Kaydedilmedi** yazısı çıkar; **💾 Eşleştirmeleri Kaydet (n Değişiklik)** hepsini işler. Son güncelleyen ve zaman satırda görünür; her kayıt işlem günlüğüne düşer."));
C.push(b("**👥 n Personel ▾** bölümün aktif personelini açar; istisnası olanlar ⚡ ile işaretlenir."));
C.push(...img("02_eslestirme","Bölüm eşleştirme: personel listesi, rol seçimi ve kaydedilmemiş değişiklik.",1500));
C.push(h2("4.3 Etkin Yetki Test Et"));
C.push(p("**🔍 Etkin Yetki Test Et** bir personelin bölüm + istisna birleşik sonucunu gösterir: yetki kaynağı, roller, görünüm geçişi, açılış ekranı ve erişebildiği sekmeler. Kaydedilmiş kurallardan hesaplanan bir ön izlemedir; asıl yetkiyi giriş anında sunucu verir."));
C.push(...img("29_yetki_simulator","Etkin yetki ön izleme."));

C.push(h1("6. Proje / Görev Havuzu Yönetimi"));
C.push(p("**Proje Havuzu** sekmesidir (Akademik Takvim ayrı sekmedir). Görev talepleri bu havuzdan seçilir. Havuz **Ana Proje › Alt Proje › Faaliyet › Yerleşke** hiyerarşisini tek bir **Ağaç-Tablo**da gösterir. Yalnızca Merkez Yönetici düzenler."));
C.push(b("**Üst kartlar:** Ana Proje, Alt Proje, Faaliyet, Yerleşke sayıları ve **Konsolide Toplam Efor** (Tam gün 1,0 • ÖÖ/ÖS 0,5 adam-gün)."));
C.push(b("**Arama ve süzgeç:** kutuya proje/faaliyet/yerleşke adı ya da **#kayıt no** yazılır; eşleşen dallar açılır ve yazı işaretlenir. **Tümü / Sadece Aktifler / Pasifler** düğmeleri. **Derinlik:** Sadece Ana Projeler, Alt Projelere Kadar, Tümünü Aç."));
C.push(b("**Satırlar:** seviyeye göre renkli ([ANA] / [ALT] / [FAALİYET]); ▸/▾ ile dal açılır; yerleşkeler 📍 ve **#no** ile gösterilir. Durum: **Aktif**, **Kısmi (a/t)** (alt dalların bir kısmı pasif), Pasif, Arşiv. Sağda her dalın toplam eforu görünür."));
C.push(b("**Alt projesi olmayan projeler:** her projenin alt projesi olması gerekmez. Ana projenin satırındaki **+ Faaliyet** düğmesi faaliyeti doğrudan ana projeye bağlar; \"Genel\" adlı alt proje ağaçta görünmez. Yeni ana proje eklerken Alt Proje alanı boş bırakılabilir."));
C.push(b("**Taşı:** satırdaki **↗ Taşı** düğmesi kaydı alt dalıyla birlikte başka bir üst kaydın altına taşır: faaliyeti doğrudan ana projeye, alt projeyi başka ana projeye ya da ana proje olarak, ana projeyi başka bir ana projenin alt projesi olarak. Ana projenin gerçek alt projeleri varsa önce onlar taşınır. Geçmiş talepler ve efor bozulmaz."));
C.push(b("**Ekle:** Ana Proje için **+ Yeni Ana Proje**, satırdaki **+ Alt Proje / + Faaliyet / + Yerleşke** düğmesi. Satır altında çok alanlı ekleme satırı açılır (örn. yeni ana proje + ilk alt proje + faaliyet + yerleşke birlikte); **Enter** ya da ✓ Ekle."));
C.push(b("**Düzenle:** ✎ Düzenle ile ad satırda yazılır; **Enter** kaydeder, **Esc** iptal eder."));
C.push(b("**Pasife Al / Aktifleştir:** üst düğümde altındaki tüm dallara uygulanır; pasif kayıt yeni talep listelerinde görünmez, geçmiş kayıtlar bozulmaz. Pasif satırda **🗄 Arşivle** (neden zorunlu) çıkar; **Arşivden çıkar** kaydı pasif olarak geri getirir."));
C.push(b("**⇄ Birleştir:** aynı ada benzer kayıt **Olası Mükerrer** rozetiyle işaretlenir. Birleştirme penceresinde doğru hedef seçilir; geçmiş talepler ve **efor hedefe aktarılır**, altındakiler hedefe taşınır, kaynak silinmez (“Birleştirildi” rozeti). Geri alınamaz."));
C.push(b("**Eski Düz Liste:** sağ üstteki düğmeyle karşılaştırma görünümü; her satırda tüm ad zinciri tekrarlanır, mükerrer görmek için kullanılır."));
C.push(b("**İşlem Günlüğü paneli (altta):** son gönderilen komut ve havuz kayıtlarının günlüğü (yalnız ekleme)."));
C.push(note("Havuzdaki her işlem işlem günlüğüne (Ayarlar › İşlem Günlüğü) yazılır. Görünüm için Ayarlar › Görünüm'den **Kurumsal Cam (koyu lacivert)** teması seçilebilir."));
C.push(...img("06_havuz","Proje Havuzu: Ağaç-Tablo, efor ve mükerrer rozeti.",600));

C.push(h1("7. Akademik ve Kurumsal Takvim Yönetimi"));
C.push(p("**Akademik Takvim** ayrı bir sekmedir. Üstte yıl seçici (◀ Yıl ▶) ve üç düğme vardır: **+ Yeni Tatil Günü Ekle**, **📋 Toplu Tatil Ekle**, **📥 Excel Şablonu İndir (CSV)**. Altında özet kartları, renk kodları, 12 aylık takvim (3×4) ve tatil listesi yer alır. Yalnız Merkez Yönetici düzenler; hafta Pazartesi başlar."));
C.push(note("**Üç tatil türü:** Resmi Tatil (mavi), İdari / Kurumsal Tatil (turuncu; yıllık izinden kesilir), Akademik Tatil (turkuaz). Yarım gün (ÖÖ / ÖS) hücrede çapraz bölünmüş görünür. Tatil gününe atama engellenmez, yalnız uyarı verilir."));
C.push(h2("7.1 Takvim ve liste"));
C.push(p("Takvimdeki bir güne tıklamak o günü ekler ya da düzenler; fare ile üzerine gelince tarih, tür ve açıklama görünür. Alttaki listede tarih/açıklama araması ve tür süzgeci vardır; her satırda **Düzenle** ve **Sil** bulunur. Sağ altta o yılın **yıllık izinden kesilecek toplamı** yazar (Tam gün = 1,0; ÖÖ/ÖS = 0,5)."));
C.push(h2("7.2 Tek gün / çok günlü ekleme"));
C.push(p("**+ Yeni Tatil Günü Ekle**: tarih, zaman dilimi, (çok günlüyse) bitiş tarihi, tür ve açıklama girilip **Kaydet**’e basılır. Tarih alanlarındaki 📅 düğmesi Pazartesi başlangıçlı takvim açar."));
C.push(h2("7.3 Toplu ekleme"));
C.push(n("**Tarih Aralığı Ekle** sekmesi: başlangıç/bitiş, tür, zaman dilimi ve “hafta sonlarını hariç tut” seçilir; kaç gün ekleneceği önceden yazılır.","n7"));
C.push(n("**Excel Satırları Yapıştır** sekmesi: “10-11-12 NİSAN Çarşamba-Perşembe-Cuma / Ramazan Bayramı” ya da “GG.AA.YYYY;Tür;Dilim;Açıklama” satırları yapıştırılır; ya da .xlsx / .csv dosyası seçilir, satırlar kutuya dökülür, gözden geçirilip eklenir.","n7"));
C.push(n("**Excel Şablonu İndir (CSV)** seçili yılın kayıtlarını (yoksa örnek satırları) Excel’de açılacak biçimde indirir.","n7"));
C.push(...img("07_takvim","Toplu Tatil Ekle penceresi: Excel satırları yapıştırma.",600));
C.push(...img("24_takvim_duzenle","Tatil günü düzenleme penceresi.",600));
C.push(...img("21_takvim","Akademik ve Kurumsal Takvim Yönetimi ekranı.",600));


C.push(h1("8. Görev talebi (Proje Sorumlusu)"));
C.push(p("Proje Sorumlusu **Görev Talep Arayüzü** sekmesini görür; Merkez Yönetici aynı ekranı **Talepler** adıyla görür ve tüm talepleri izler, talepleri vekâleten açabilir."));
C.push(h2("8.1 Taleplerim listesi"));
C.push(p("Her talep bir kart olarak görünür: kod (**TLP-YYYY-NNNN**, örn. TLP-2026-0001; numara her yıl 0001'den başlar), tarih aralığı, mesai saati, proje yolu, konum, önerilen personel, gün ve kişi-gün sayısı ve **durum rozeti**. Üstteki düğmelerle Bekleyen / Atanmış / Kapalı süzülür."));
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
C.push(p("Onay bekleyen ya da kısmen atanmış talep kartının altında ortalanmış **Atama Yap / Gün Bazlı Böl** düğmesi atama panelini açar (yanında **Zorunlu Açıklamayla Reddet**). Kartın sağındaki kaydırmalı kutu, Ana Proje bazlı geçmiş deneyim tavsiyelerini listeler. Solda her gün/dilim için **atanan / istenen** görülür, altta adaylar, sağda talep özeti ve **Karar** kartı bulunur."));
C.push(n("Soldaki tabloda atama yapmak istediğiniz satırları işaretleyin (dolu satırlar seçilemez).","n8"));
C.push(n("**Hızlı atama:** kartın sağındaki tavsiye kutusunda yalnız **Saha Personeli** rolündeki kişiler çıkar. Her adayın yanındaki **Ata** düğmesi, görevde günlük tek kişi isteniyorsa kişiyi görevin tüm günlerine tek tıkla atar; birden fazla personel isteniyorsa (ya da çakışma varsa) atama ekranı açılır. Atama yapılınca kartın başlığında “✔ Ad Soyad atandı” görünür. **İleriye dönük atama sınırı 14 gündür**; daha ileri tarihe atama yapılamaz.","n8"));
C.push(n("Adaylar listesinde **Önerilen** kişi ve o Ana Projede daha önce çalışanlar üsttedir; çakışması olana “Çakışma: N gün”, olmayana “Müsait” yazar. Adın yanındaki **Seçili günlere ata** düğmesi kişiyi işaretli satırlara bekleme listesine ekler (Karar kartında görünür, × ile çıkarılır).","n8"));
C.push(n("**Atamayı onayla**'ya basın. Kısmi atama serbesttir: talep **Kısmen atandı** olur; istenen sayıya ulaşılınca **Tamamen atandı**.","n8"));
C.push(...img("10_atama_paneli","Atama paneli: gün/dilim tablosu, adaylar, talep özeti ve karar kartı.",1250));
C.push(note("**Çakışma kararı.** Seçilen kişi aynı gün (tam gün ya da örtüşen dilim) başka bir görevdeyse sistem kendi başına karar vermez; çakışan görev ve sorumlusu gösterilir. **Vazgeç** hiçbir şey yazmaz. **Çakışan görevden çıkar ve bu göreve ata** çakışan atamayı çıkarır, o talebin sorumlusuna bildirim gider ve işlem denetim kaydına yazılır. Öğleden önce ile öğleden sonra birbirini çakıştırmaz. İzin ve rapor çakışmasında çıkarma seçeneği olmayacaktır (atama reddedilir; sonraki dilim)."));
C.push(note("**Reddetme.** Onay bekleyen talepte **Reddet…** ile ret nedeni (zorunlu) yazılır; Sorumlu kartında nedeni ve bir bildirim görür. Atama başlamış talep reddedilemez."));
C.push(note("**Sorumlu tarafı.** Taleplerim sayfasının üstünde yeni bildirimler görünür (atandı, reddedildi, görevden çıkarıldı); **Tümünü okundu say** ile kapanır. Atama yapılmış talepte **Atananlar** düğmesi gün gün kimin atandığını gösterir."));

C.push(h2("8.4 Haftalık Özet (herkes)"));
C.push(p("**Haftalık Özet** sekmesi Yönetici, Proje Sorumlusu ve Saha personeli için açıktır; yalnız okunur. Satırda personel, sütunda 7 gün vardır; kart ÖÖ/ÖS bölünmüş olabilir."));
C.push(n("**Üst kartlar:** Toplam Saha Personeli, Görevli / Müsait Adam-Gün (Tam = 1,0; ÖÖ/ÖS = 0,5), İzin / Rapor ve **İkame / Çakışma Uyarısı** (görevi olan günde izin ya da rapor çıkmışsa).","n8"));
C.push(n("**Hafta gezgini:** ◀ Önceki / Sonraki ▶, hafta listesi (HFT numaralı), **Bu hafta**, **GG.AA.YYYY** kutusu. **Arama** personel, proje, faaliyet, yerleşke, talep no ve sorumluyu bulur; Bölüm / Ana Proje / Yerleşke / personel süzgeçleri korunur.","n8"));
C.push(n("**Hazır Görünümler:** Tüm Ekip, Hızlı Atama (Müsaitler Üstte), Gölbaşı Saha Odak, Çakışma & İkame. **+ Görünümü Kaydet** mevcut ayarları kişisel sekme yapar; **↺ Varsayılana Sıfırla**. Ayarlar yalnız bu bilgisayarda saklanır.","n8"));
C.push(n("**⚙️ Görünümü Özelleştir** (sağ çekmece, 5 katman): hücre yoğunluğu (Kompakt/Standart/Detaylı); bilgi alanları; satır gruplama (durum, ana proje, yerleşke) ve 📌 ile **personel sabitleme**; renk modu (durum, ana proje, yerleşke); akıllı odak (proje, yerleşke, sadece müsait, sadece çakışma) ve hafta sonu sütunu (normal, dar, gizle) ile takvim tatillerini yansıtma.","n8"));
C.push(n("**Renkler:** yeşil kesikli = müsait, mavi = görevli, turuncu = izin (kesikli: onay bekliyor), kırmızı = rapor / çakışma, sarı-kırmızı üst rozet = resmi/idari tatil ya da 0,5 gün arife. Odak dışındaki kartlar silikleşir.","n8"));
C.push(n("**Karta basınca** ayrıntı penceresi açılır (talep, proje, faaliyet, yerleşke, saat, sorumlu). Müsait günde Yönetici **Görev talebi gir (vekâleten)**'e, ⚠️ ikame gereken kartta **Revize & İkame** sekmesine geçebilir. İzin/rapor kayıtları Yönetici dışında 🔒 salt-okunurdur. **Excel'e aktar** görünen hafta ve süzgeçlerle .xlsx yazar.","n8"));
C.push(...img("11_matris","Haftalık Özet: kartlar, hazır görünümler, renk lejantı ve bölünmüş hücreler.",1500));
C.push(...img("26_matris_cekmece","Görünümü Özelleştir çekmecesi (5 katman).",1300));
C.push(note("**Otomatik yenileme.** Ekran 30 saniyede bir haftanın atamalarında değişiklik olup olmadığına bakar; değişmişse tabloyu kendiliğinden tazeler (üstte “Son yenileme” saati görünür). Sarı sütun akademik takvimdeki tam gün tatildir. İzin ve rapor günleri sonraki dilimde bu tabloya eklenecektir."));

C.push(h2("8.5 İzin, rapor ve görevlerim"));
C.push(p("**Saha personeli** için menüde **Görevlerim**, **Yönetici** için **İzin Onayları** sayfası bulunur. **Proje Sorumlusu** için **İzin / Rapor Bilgisi** yalnız okunur bir listedir: önümüzdeki 7/14/30 günde izinli ve raporlu personel görünür, hiçbir işlem yapılamaz. Saha sayfasının üstünde kendi görevleriniz (son 14 gün ve önümüzdeki 90 gün) listelenir."));
C.push(n("**İzin talebi:** tür, başlangıç ve bitiş tarihini **GG.AA.YYYY** yazın; tam gün ya da yalnız öğleden önce/sonra seçin; **Talebi gönder**. Hafta sonu ve tatiller varsayılan olarak atlanır. Talep Yönetici onayına gider; onaylanan günlere atama yapılamaz. Bekleyen talebi **Geri çek** ile iptal edebilirsiniz.","n8"));
C.push(n("**Rapor beyanı:** ilk/son günü yazın, **Evrak seç…** ile PDF, JPG ya da PNG dosyası (en fazla 10 MB) seçin, **Raporu kaydet**. Evrak zorunludur. Rapor izinden önceliklidir: aynı günlerdeki izin iptal olur; o günlerde göreviniz varsa görev durur ve Yönetici ikame için uyarılır.","n8"));
C.push(n("**Yönetici:** bekleyen izinleri **Onayla** ya da nedenle **Reddet…**; onaylı izni **Kısalt…** ya da geri çekebilir. Onay sırasında kişinin o günlerde görevi varsa **Çakışma kararı** kutusu çıkar: *Vazgeç* ya da *Çakışan görevden çıkar ve izni uygula*. **Vekaleten** kutusundan başka biri adına izin/rapor girilebilir (izin anında onaylanır).","n8"));
C.push(...img("12_izin_rapor","Görevlerim: kişisel görevler, izin talebi ve rapor beyanı.",1500));
C.push(note("**Matriste görünüm.** Haftalık matriste izin gri blok (kesikli çerçeve: onay bekliyor), rapor kırmızı blok olarak görünür; yarım gün izin yalnız ilgili yarıyı kaplar."));

C.push(h2("8.6 Atanmış talepte iptal, erken bitiş, ikame, revize ve devir"));
C.push(p("Talep listesinde **Kısmen/Tamamen atandı** durumundaki taleplerde **Yönet…** düğmesi çıkar. Açılan sayfada talebin günleri ve atananlar listelenir."));
C.push(n("**Yönetici:** atanan kişinin yanındaki **Çıkar** o günkü atamayı kaldırır (neden zorunlu); **İkame…** kişinin yerine başkasını atar (yeni kişi seçilir, isterseniz başlangıç tarihi yazılır; boşsa bugünden itibaren). Yeni kişi başka görevdeyse **Çakışma kararı** kutusu çıkar; izin ya da raporluysa işlem reddedilir.","n8"));
C.push(n("**Erken bitir…:** yeni son günü yazın; sonraki günler ve atamalar kalkar. **Görevi iptal et…:** tüm atamalar kalkar, talep İptal olur (görev başlamışsa iptal yerine erken bitiş kullanılır). Her ikisinde de etkilenen kişilere bildirim gider.","n8"));
C.push(n("**Revize…:** görev metni, Saha / Operasyon Notu, saat ve gün başına kişi sayısı değiştirilir. Proje Sorumlusu **Revize iste** der, Yönetici **Onayla** ya da nedenle **Reddet…** der; Yönetici revizeyi doğrudan uygulayabilir. Atanmış kişiden az kişi sayısı yazılamaz; önce kişi çıkarılır.","n8"));
C.push(n("**Sorumlu devret…** (Yönetici): talebin Proje Sorumlusu başka kişiye geçer; eski ve yeni sorumluya bildirim gider, geçmiş sayfanın altında görünür.","n8"));
C.push(...img("13_yonet","Yönet sayfası: atananlar, ikame/çıkarma, erken bitiş formu ve revizeler.",1500));

C.push(h2("8.7 Analiz ve arşiv"));
C.push(p("Sekme şeridindeki **Analiz** sayfası Yönetici ve Proje Sorumlusu içindir (Sorumlu yalnız kendi taleplerini görür). Üç sekmesi vardır; her sekmede **Excel'e aktar** düğmesi bulunur."));
C.push(n("**Proje adam-gün:** başlangıç ve bitiş tarihini GG.AA.YYYY yazıp **Uygula** deyin (ya da Bu ay / Son 3 ay / Bu yıl / Geçen yıl düğmeleri). Ana proje, alt proje ve faaliyet bazında adam-gün görünür; tam gün 1,0, öğleden önce/sonra 0,5 sayılır. Ana proje listesinden süzebilirsiniz.","n8"));
C.push(n("**Personel:** kişi başına adam-gün, görev günü, proje sayısı ve (Yönetici için) izin ile rapor günleri; hangi ana projede kaç adam-gün çalıştığı yanında yazar. Bir satıra tıklayınca o kişinin gün gün görev, izin ve rapor dökümü açılır. Ad/sicil ve bölüm süzgeci vardır.","n8"));
C.push(n("**Arşiv (geçmiş görevler):** eski araçtan aktarılan, tarihi bilinmeyen \"kim hangi projeye gitti\" kayıtları; kişi, proje ya da görev metniyle aranır. Geçmiş dönemler için Proje ve Personel sekmelerinde tarih aralığını geriye alın.","n8"));
C.push(...img("14_analiz","Analiz: ana proje bazlı adam-gün.",1500));

C.push(h2("8.10 Ayarlar, işlem günlüğü ve rol bazlı listeler"));
C.push(n("**Ayarlar › Görünüm ve yazı:** Hazır ve özel temalar, buzlu cam (blur) düzeyi, genel yazı boyutu (%85–%150), tablo/matris yazısı ve yazı tipi seçilir; varsayılan yazı tipi uygulamaya gömülüdür, tercih yalnız bu bilgisayarda saklanır. Yönetici ayrıca Kadro, Eski veri ve Sistem sekmelerini görür; roller ve işlem günlüğü **Kullanıcı Yetki** sekmesindedir.","n8"));
C.push(n("**İşlem günlüğü:** Yönetici tarih aralığı, işlem türü ve metin ile süzerek kimin neyi ne zaman yaptığını görür (en yeni 500 kayıt). Kayıtlar değiştirilemez.","n8"));
C.push(...img("17_gunluk","Ayarlar › İşlem Günlüğü (yalnız Merkez Yönetici)."));
C.push(n("**Rol bazlı listeler:** Talep formunda talep sahibi (Yönetici vekâleten açarken) yalnız Proje Sorumlusu rolündeki kişilerden, önerilen personel ise Saha Personeli rolündekilerden seçilir. Roller Kullanıcı Yetki sekmesinden gelir.","n8"));
C.push(n("**Rapor tarihi düzeltme:** Yönetici, geçerli raporun satırında **Tarihi düzelt…** ile ilk/son günü değiştirir; yeni aralıktaki izinler iptal olur, çakışan görevler için uyarı verilir.","n8"));
C.push(n("**Revizede kişi azaltma:** kişi sayısı düşen revizede **Onayla** çıkarılacak kişilerin seçim kutusunu açar; seçilenler görevden çıkarılır ve revize uygulanır. Eklenen günlerde atanmış kişilerin müsaitliği (müsait/görevde/izinli/raporlu) onaydan önce görünür.","n8"));
C.push(n("**Analiz ve matris:** Analizde **Proje kırılımı** sekmesi Ana → Alt Proje → Yerleşke → Personel adam-günü gösterir (Excel'e de aktarılır). Matriste Personel süzgeci Görevli/izinli, Sadece müsaitler veya Tümü olarak seçilir.","n8"));
C.push(h2("8.9 Saha notu, iletişim, rozetler ve ikame uyarısı"));
C.push(n("**Saha / Operasyon Notu:** talep formunda araç, teçhizat (KKD), giriş kişisi, konaklama gibi bilgiler çok satırlı yazılır (en fazla 1000 karakter). Eski \"Aranan nitelik\" alanının yerini almıştır.","n8"));
C.push(n("**İletişim:** talep listesinde ve Saha'nın Görevlerim sayfasında **İletişim / Göster** saha notunu ve Proje Sorumlusunun telefonunu açar. Yönetici ve Proje Sorumlusu ayrıca atananların telefonlarını görür; Saha görmez.","n8"));
C.push(n("**Sekme rozetleri:** Talepler, İzin Onayları ve Görevlerim sekmelerindeki kırmızı sayı bekleyen işi gösterir; üzerine gelince dökümü çıkar. Sayfalar 30 saniyede bir kendiliğinden yenilenir (yazı yazarken bozulmaz); üstteki **Yenile** düğmesi anında yeniler.","n8"));
C.push(n("**İkame bekleyen görevler:** raporlanan, kadrodan ayrılan ya da birimi değişen kişinin ileri tarihli atamaları Talepler sayfasındaki uyarı kutusunda listelenir; **Yönet…** ile ikame yapılır.","n8"));
C.push(n("**Analiz ve atama:** aday kartında projedeki görev sayısı, adam-gün, yerleşke ve müsait gün görünür; Personel analizinde müsait gün, tatil günü ve tatilde çalışma sütunları vardır. Matriste **Yerleşke** süzgeci bulunur; rapor evrakı **Ad_Soyad_yyyymmdd_KOD** adıyla iner.","n8"));
C.push(h2("8.8 Eski veri aktarımı ve canlıya geçiş"));
C.push(p("Bu bölüm yalnız Merkez Yönetici içindir. Canlıya geçmeden önce veritabanının tam yedeği alınmış olmalıdır."));
C.push(n("**Eski veri aktarımı:** Eski veri sayfasında önce **Dosya seç ve denetle** ile kuru çalıştırma raporunu okuyun. Sonra Aktarım kartında kutuya `AKTAR` yazıp **Dosya seç ve aktar** deyin. Görevliler talep ve atama, izinliler onaylı izin, raporlular evraksız rapor olur; haftası bilinmeyen ya da kadroda eşleşmeyen kişilerin görevleri tarihsiz geçmişe (Arşiv) yazılır. Özet satırındaki sayıları rapordakilerle karşılaştırın.","n9"));
C.push(n("**Aktarımı geri al:** yanlış aktarıldıysa kutuya `GERIAL` yazıp **Aktarımı geri al** deyin; yalnız eski araçtan gelen kayıtlar silinir, elle girdikleriniz kalır. Sonra düzeltip yeniden aktarabilirsiniz. Canlıya geçildikten sonra aktarım ve geri alma kapanır.","n9"));
C.push(n("**Canlıya geçiş:** Sistem sayfasındaki Canlıya geçiş kartı 8 maddelik kontrol listesi gösterir. İlk dört madde zorunludur (ortam TEST, yönetici var, kadro dolu, havuzda konum var); eksikse düğme pasif kalır. Asgari sürüm kutusuna dağıttığınız sürümü yazın (eski exe bağlanamasın), `CANLI` yazıp **Canlıya geç** deyin. Geçiş tek yönlüdür; acil geri dönüş yalnız veritabanı yöneticisinin `gorev_geri_donus.sql` betiğiyle yapılır (`docs/CANLIYA-GECIS.md`).","n9"));
C.push(...img("15_canli","Sistem sayfası: canlıya geçiş kontrol listesi.",1500));

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
  ...["num1","n2","n3","n4","n5","n7","n8","n9"].map(r=>({reference:r,levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}))]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1300,right:1273,bottom:1300,left:1273}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Personel Görevlendirme – Kullanma Kılavuzu   |   Sayfa ",size:18,color:"777777"}),new TextRun({children:[PageNumber.CURRENT],size:18,color:"777777"})]})]})},
  children:C}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("../../docs/Kullanma-Kilavuzu.docx",b);console.log("ok")});
