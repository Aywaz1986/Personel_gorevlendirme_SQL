const fs=require('fs');const d=require('docx');
const {Document,Packer,Paragraph,TextRun,ImageRun,HeadingLevel,AlignmentType,Table,TableRow,TableCell,WidthType,ShadingType,BorderStyle,LevelFormat,PageBreak,TableOfContents,Footer,PageNumber}=d;
const FONT="Calibri";
let FIG=0;const img=(n,c0)=>{const cap="Şekil "+(++FIG)+" – "+c0;return [new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:120,after:60},keepNext:true,children:[new ImageRun({type:"png",data:fs.readFileSync(`shots/${n}.png`),transformation:{width:560,height:373},altText:{title:cap,description:cap,name:n}})]}),
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
C.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:1200},children:[new TextRun({text:"SQL Server sürümü (Windows, tek exe) – Dilim 2: kimlik, roller, kadro",size:24,color:"666666"})]}));
C.push(note("**Bu kılavuzdaki ekran görüntüleri** uydurma örnek verilerle alınmıştır; gerçek personel verisi içermez. Gördüğünüz menüler yetkinize göre değişir. Kılavuz her dilimde güncellenir; henüz gelmemiş ekranlar (atama paneli, talep, haftalık matris, izin/rapor) ilgili dilimlerde eklenecektir.","E8F0FA"));
C.push(new Paragraph({children:[new PageBreak()]}));
C.push(new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun("İçindekiler")]}));
C.push(new TableOfContents("İçindekiler",{hyperlink:true,headingStyleRange:"1-2"}));
C.push(new Paragraph({children:[new PageBreak()]}));

C.push(h1("1. Uygulama nedir?"));
C.push(p("Personel Görevlendirme; personelin projelere görevlendirilmesini, görev taleplerini ve izlenmesini tek yerde yürüten Windows uygulamasıdır. Tek bir .exe dosyasıdır, kurulum gerekmez. Veriler Özlük ile aynı SQL Server veritabanında (SST_Ozluk), yalnızca `gorev` şemasında tutulur. Özlük verisine hiçbir şey yazılmaz; yalnızca kadro bilgisi okunur."));
C.push(h2("1.1 Roller"));
C.push(tbl([2300,7060],[["Rol","Ne yapar"],["Merkez Yönetici","Kadro eşitleme, bölüm–rol eşleştirme, kişi istisnaları, atama (sonraki dilimler)."],["Proje Sorumlusu","Görev talebi açar ve izler (Dilim 4)."],["Saha Personeli","Kendi görevlerini izler, izin/rapor beyan eder (Dilim 7)."]]));
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

C.push(h1("6. Yetkisiz erişim"));
C.push(p("Hesabınız kadroda yoksa, pasifse ya da hiçbir rolü çözülmediyse bu sayfa açılır. **Hesap adını kopyala** ile adınızı merkez yöneticisine iletin."));
C.push(...img("05_yetkisiz","Yetkisiz erişim sayfası."));

C.push(h1("7. Sık sorulan sorular"));
C.push(tbl([3300,6060],[["Sorun","Çözüm"],["Yetkisiz Erişim görüyorum","Hesabınız kadroda yok/pasif ya da bölümünüze rol eşleştirilmemiş; yöneticiye hesap adınızı iletin."],["Eşitleme “eksik okuma” diye iptal oldu","Özlük’te tüm kurum kapsamı olan bir hesapla çalıştırın."],["Eşitleme “Özlük yetkisi” hatası verdi","Hesabınız Özlük’te yönetici ya da tüm kurum kapsamlı İK/görüntüleyici değil."],["Kendi yöneticiliğimi kaldıramıyorum","Sistemde tek aktif yönetici sizsiniz; önce başka bir yönetici atayın."]]));

C.push(h1("8. Sorun giderme (BT için)"));
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
  ...["num1","n2","n3","n4","n5"].map(r=>({reference:r,levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}))]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1300,right:1273,bottom:1300,left:1273}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Personel Görevlendirme – Kullanma Kılavuzu   |   Sayfa ",size:18,color:"777777"}),new TextRun({children:[PageNumber.CURRENT],size:18,color:"777777"})]})]})},
  children:C}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("../../docs/Kullanma-Kilavuzu.docx",b);console.log("ok")});
