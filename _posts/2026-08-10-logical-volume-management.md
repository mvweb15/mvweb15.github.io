---
title: "Logical Volume Management"
tags: [lvm]
cover: /assets/images/cover-lvm.jpg
---
Logical Volume Management (LVM) konusunu anlatmaya başlamadan önce kısaca bu yazının ortaya çıkma sebebinden ve içeriğinden bahsetmek istiyorum. İnternette LVM hakkında bir çok yazı bulunsa da, konuyu araştırmaya başladığım sürede okuduğum bazı yazıların ortak özelliği yeterince açıklayıcı veya kapsamlı olmamasıydı. Bu yüzden öğrendiklerimi, bu konunun temeli olan fiziksel disklerden en üst katmanına kadar bir bütün şeklinde açıklayarak bu yazıda toplamak istedim. İlk olarak LVM’siz bir sistemde oluşan bir duruma göz atacağız. Sonrasında ise LVM'in ne olduğunu ve yapısını açıklayarak bu durumu nasıl çözdüğünü açıklayacağım. Daha sonra LVM'in diğer avantajlarını anlatacağım.

## Log Dosyalarının Diski Doldurması

Öncelikle LVM’siz bir sistemde depolama alanı dolduğunda oluşan duruma bakalım. Sistemin `lsblk` komutu ile görüntüsü şu şekilde:
![lsblk komutu çıktısı](/assets/images/lvm/lsblk_cikti.png)

Aşağıdaki ekte sisteme yeni eklenmiş 20 GB’lık `/dev/sdb` depolama birimi bulunuyor. Bu depolama birimi `/dev/sdb1` ve `/dev/sdb2` olarak 10 GB’lık bölümlere ayrılmış. `/data1` ve `/data2`’ye mount edilen bu iki bölüm uygulamaların log dosyalarını kaydetmek için oluşturulmuş.
![lsblk komuut çıktısı2](/assets/images/lvm/2_lsblk.png)

Gerçek hayatta karşılaşılan sorunlardan birisi olan, log dosyalarının diskteki alanını tüketmesini simule edelim. Bu komut diski hızlıca dolduracağından kendi sistemlerinizde denemeyin.

`cat /dev/zero > /data1/application.log`

`cat /dev/zero > /data2/application.log`

Aşağıdaki diagramda LVM’siz bir sistemi ve `watch df -h` komutu ile yaptığımız işlemi daha net görebilirsiz. Log dosyalarının diskteki alanı tüketmesini simule ediyoruz ve disk bu komuttan sonra dolmaya başlıyor.
{% include video-loop.html src="/assets/videos/lvm/diskdolumu.mp4" %}

Bu durumda tabii ki log dosyalarını başka bir diske taşımayı veya silmeyi tercih edebilirsiniz. Fakat bu süreç tahmin edebileceğiniz gibi disk sayısı arttıkça zorlaşır. Bu durumda LVM kullanarak dosya sisteminizi genişletebilirdiniz veya farklı şekillerde bu sorunu çözebilirdiniz. Fakat yukarıda gördüğünüz sistemde LVM kullanılmadığı için, dosya sisteminizi genişletemezsiniz. Şimdi bu sorunu çözen ve bir çok avantaj sağlayan LVM’i açıklayıp nasıl kullanacağımızı anlatacağım.

## LVM nedir ?
Resmi Red Hat dokümantasyon sitesinde yazıldığı şekilde, LVM fiziksel depolama üzerinde bir soyutlama katmanı oluşturarak mantıksal depolama birimleri (logical volume) oluşturmanızı sağlar. Bu, fiziksel depolamayı doğrudan kullanmaya kıyasla birçok açıdan çok daha fazla esneklik sunar. Bir logical volume ile, fiziksel disk boyutlarıyla sınırlı kalmazsınız. Ayrıca, donanım depolama yapılandırması yazılımdan gizlenir, böylece uygulamalar durdurulmadan veya dosya sistemleri unmount edilmeden yeniden boyutlandırılabilir ve taşınabilir. Bu da operasyonel maliyetleri azaltabilir. LVM ayrıca anlık görüntü alma (snapshot), şeritleme (striping) ve yansılama (mirroring) gibi gelişmiş özellikler de sunar.

## LVM'in Bileşenleri
Teknik tanımda da yazdığı gibi LVM fiziksel depolama üzerinde bir soyutlama katmanı oluşturur. Bu katman aşağıda gördüğünüz üzere 3 bileşenden oluşur.
<img src="/assets/images/lvm/lvmbilesen.png" alt="lvmbilesen" class="post-img" style="max-width: 350px;">
## Fiziksel Hacim (Physical Volumes)
LVM yapısının en alt katmanını oluşturur. Bir disk, disk bölümü (partition) veya RAID dizisi gibi fiziksel bir depolama biriminin, LVM tarafından kullanılabilir hale getirilmesiyle oluşur. Bir fiziksel diskin LVM tarafından yönetilebilmesi için önce Fiziksel Hacim'e dönüştürülmesi gerekir.
## Hacim Grubu (Volume Group)
LVM, Fiziksel Hacim olarak oluşturulmuş bu depolama birimlerini Hacim Grubu denilen depolama havuzunda toplar. Fiziksel Hacimler tek başlarına kullanılamaz; ilk olarak bir Hacim Grubu’na dahil edilirler ve böylece farklı boyutlardaki disklerin kapasiteleri tek bir mantıksal havuzda birleştirilmiş olur. Bu Hacim Grubu’u, Mantıksal Hacim’lerin kullanacağı ortak depolama alanını temsil eder.
## Mantıksal Hacim (Logical Volumes)
LVM yapısının en üst katmanıdır. Hacim Grubu’nun içinden, ihtiyaca göre belirli bir boyutta ayrılan bölümdür. Mantıksal Hacim’ler, klasik disk bölümlerine (partition) benzer şekilde davranır ve üzerine dosya sistemi kurulabilir, biçimlendirilebilir ve mount edilebilir. Fiziksel diskin aksine, Mantıksal Hacim’lerin boyutu Hacim Grup’larının kapasitesine göre kolayca büyüyüp küçülebilir. Bu daha önce anlattığım durumdan da anlaşılabileceği gibi LVM’in en büyük avantajlarından biridir.
Bu tanımları yaptığıma göre sizi daha fazla teknik bilgiye boğmadan kalan detayları LVM konfigürasyon senaryosu üzerinden anlatarak devam edeceğim. Yazının ilerleyen kısımlarında size ve bana kolaylık sağlaması için bu terimleri bilmenizi tavsiye ediyorum:

PV: Fiziksel Hacim

VG: Hacim Grubu

LV: Mantıksal Hacim

## LVM Konfigürasyon Senaryosu
LVM’i ve yapısını açıkladığıma göre, konuyu daha iyi anlatabilmek için bir senaryo üzerinden LVM konfigürasyonu yapacağım. Senaryomuz şu şekilde:

Sisteme yeni eklenen 50 GB ve 100GB  olmak üzere 2 adet disk bulunmakta. Daha önce anlattığım “log dosyalarının diski doldurması” sorununa çözüm olarak bu diskleri LVM ile yönetmeye karar veriyoruz.
Bu diskleri ilk önce PV’ye dönüştürüp, sonrasında LVM’e dahil edeceğiz. Ardından bu PV’leri, VG dediğimiz ortak bir havuzda birleştireceğiz. Bu havuzdan 25GB boyutunda `lv_data1` ve 50GB boyutunda `lv_data2` LV'lerini oluşturacak ve üzerlerine dosya sistemi kurarak `/data1` ve `/data2` konumlarına mount edeceğiz.

Kurulumu tamamladıktan sonra, `/data1` üzerinde log dosyasının diski doldurması senaryosunu tekrar simule edeceğiz. Çözüm olarak LV’nin ait olduğu VG’deki boş alanı kullanarak doğrudan LV’mizin boyutunu büyüteceğiz.
Sonrasında `/data2`’nin de boş alanını dolduracağız. Bu LV’nin boyutunu 150GB olarak genişletmeyi istediğimizde VG’de boş alanın kalmadığını göreceğiz.
Bu sorunu çözmek için 3. bir diski VG’ye ekleyip havuzu genişleteceğiz ve `/data2`'yi büyüteceğiz. Daha sonra `lv_data1` LV'sinin ait olduğu diskin bozulmaya başladığını varsayarak `lv_data1`'i başka bir diske aktaracağız. Bu işlemleri tamamladıktan sonra LVM’in diğer özelliklerini göstereceğim.
## Açıklamalı LVM Konfigürasyonu
İlk olarak `lsblk` komutu ile yeni diskleri görelim.
![diskler](/assets/images/lvm/diskler.png)

Fiziksel Diskleri, PV’ye dönüştürmeden önce şundan bahsetmeliyim. Fiziksel diskleri bölümlemeden (partition) direkt LVM’e eklemek mümkün. Diğer şekilde Fiziksel diskleri bölümyelip, bu bölümlerden PV oluşturarak LVM’e eklemeniz de mümkün. Fakat Red Hat dokümantasyon sitesinde yazdığına göre genellikle bütün bir diski kaplayan tek bir disk bölümü oluşturup, bu bölümü Linux LVM olarak  işaretlemek ve sonrasına PV’ye dönüştürmek tavsiye ediliyor. Bu yüzden diskleri doğrudan kullanmak yerine Red Hat önerilerine bağlı kalacağım. Bu detayı açıkladığıma göre devam edebiliriz.

## Disk Bölümleme
İlk olarak `fdisk` komutu ile yeni eklenen diskleri tek bir bölüm (partition) olacak şekilde bölümleyeceğiz ve Linux LVM olarak işaretleyeceğiz.
`fdisk /dev/sdb` komutunu çalıştırıp `n` yazın ve yeni bir partition oluşturma işlemine başlayın.

<img src="/assets/images/lvm/fdisk.png" alt="fdisk" class="post-img post-img--left" style="max-width: 650px;">

Şimdi `p` yazarak primary partition seçeneğini seçin. `Partition number` kısmına 1 yazın. Bu bölümlemede bütün diski kullanacağımız için `First sector` ve `Last Sector` seçeneklerini boş bırakarak geçebilirsiniz.
<img src="/assets/images/lvm/part.png" alt="part" class="post-img post-img--left" style="max-width: 650px;">
Diski Linux LVM olarak işaretlemek için `t` yazın. Seçenekleri görmek için `L` yazın.
<img src="/assets/images/lvm/toption.png" alt="toption" class="post-img post-img--left" style="max-width: 650px;">
Bölümü `8E` hex kodunu kullanarak Linux LVM olarak işaretleyin.
<img src="/assets/images/lvm/83.png" alt="83" class="post-img post-img--left" style="max-width: 650px;">
Yaptığınız değişiklileri `p` yazarak kontrol edin ve `w` ile kayderek çıkış yapın.
<img src="/assets/images/lvm/poption.png" alt="poption" class="post-img post-img--left" style="max-width: 650px;">
Bu işlemin aynısını `/dev/sdc` için tekrar edin. Diskler bu şekilde görünmeli:
<img src="/assets/images/lvm/diskler2.png" alt="diskler2" class="post-img post-img--left" style="max-width: 650px;">

## Fiziksel Disk bölümlerini Fiziksel Hacim'e Dönüştürme
Fiziksel Hacim (PV) oluşturmak için  `pvcreate` komutunu kullanıyoruz. Bölümü LVM'de kullanmak üzere PV'ye dönüştürmek için `pvcreate /dev/sdb1` komutunu çalıştırın.
<img src="/assets/images/lvm/pvcreate1.png" alt="pvcreate1" class="post-img post-img--left" style="max-width: 650px;">
Oluşturduğumuz PV'nin detaylarını görmek için `pvdisplay` komutunu kullanın.
<img src="/assets/images/lvm/sonpv.png" alt="pvdisplay" class="post-img post-img--left" style="max-width: 650px;">
1: PV’nin adı oluşturduğumuz Fiziksel diskin adı olan `/dev/sdb1`.

2: `VG Name` boş çünkü henüz bu Fiziksel Hacmi bir Hacim Grubu’na eklemedik.

3: `PV Size 50 GiB` Fiziksel Hacmin boyutunu belirtiyor. Buradaki `GiB` ile `GB`’ı karıştırmayın. Aralarındaki farka kaynaklar kısmından ulaşabilirsiniz.

4: `Allocatable NO` çünkü Fiziksel Hacim henüz bir Hacim Grubu’na eklemedik.

5 - 6 - 7 - 8: Bu kısmımda PE’nin ne olduğunu açıklayayım. PE (Physical Extent) yani Fiziksel Birim, Fiziksel Hacim (PV) üzerindeki en küçük depolama biriminidir. Fiziksel Hacim, Hacim Grubu’na dahil edildiğinde disk byte şeklinde değil, sabit boyutlu bloklara (extent) bölünerek yönetilir. Bu blokların boyutu 4 MiB. Yani bu Fiziksel Hacim’imiz henüz bir Hacim Grubu’na eklenmediği için henüz extentlere bölünmedi ve bu yüzden PE ile alakalı kısımlarda şimdilik 0 yazıyor.

9:  Fiziksel Hacmin benzersiz kimlik numarasıdır. Bu UUID, `/dev/sdb1` gibi bir diskin en başındaki LVM metadata alanına (header) yazılıyor. Yani UUID işletim sistemi tarafında değil, diskin kendi üzerinde fiziksel olarak taşınıyor. Diskin ismi, sırası değişse veya başka bir sunucuya geçse bile PV UUID sabit kalır. LVM yapısı, Fiziksel Hacim (PV), Hacim Grubu (VG) ve Mantıksal Hacim (LV) arasındaki ilişki, bu UUID'ler üzerinden çapraz referans (PV↔VG↔LV) yapılarak oluşur.

Şimdi `/dev/sdc1` diskini Fiziksel Hacim’e dönüştürerek devam edelim.

`pvcreate /dev/sdc1`
<img src="/assets/images/lvm/devsdc.png" alt="devsdc" class="post-img post-img--left" style="max-width: 650px;">
Oluşturduğumuz PV’leri özet halinde görmek için `pvs` komutunu kullanın.
<img src="/assets/images/lvm/pvs.png" alt="devsdc" class="post-img post-img--left" style="max-width: 650px;">
Artık disklerimiz LVM tarafından kullanılmaya ve VG oluşturmaya hazır. 

## Fiziksel Hacimlerden Hacim Grubu Oluşturma
Şimdi oluşturduğumuz bir PV ile `vgcreate` komutunu kullanarak VG oluşturacağız. Sonrasına bu havuza diğer PV’leri ekleyeceğiz.

Kullanım: `vgcreate <vg_adi> <pv_yolu>`

Komut: `vgcreate vg_base /dev/sdb1`
<img src="/assets/images/lvm/vgcreate.png" alt="vgcreate" class="post-img post-img--left" style="max-width: 650px;">
VG’yi incelemeye başlamadan önce az oluşturduğumuz `/dev/sdb1` PV'sinin detaylarına tekrardan bakalım.
<img src="/assets/images/lvm/sdbbb.png" alt="display" class="post-img post-img--left" style="max-width: 650px;">
1: PV, artık bir VG’ye dahil olduğu için tahsis edilebilir durumda.

2: Daha önce açıkladığım üzere PV, VG’ye dahil edildikten sonra 4 MiB’lik bloklara bölünmüş.

3: PV’nin toplam 12799 adet 4 MiB’lik bloklardan oluştuğunu ve boş alanı belirtiyor.

4: Bu diskten henüz bir alan tahsis edilmemiş.

İki PV’mizi karşılaştırarak farkı daha iyi görebiliriz.
<img src="/assets/images/lvm/vgeklenmis.png" alt="fark" class="post-img post-img--left" style="max-width: 650px;">
Gördüğünüz gibi `/dev/sdb1` PV’si, VG’ye eklendikten sonra 12799 adet 4.00 MiB boyutunda bloklara bölünmüş. PV `/dev/sdc1` ise henüz bir VG’ye eklenmediği için bloklara bölünmemiş. Şimdi `vgdisplay` komutu ile oluşturduğumuz VG’yi inceleyelim.
<img src="/assets/images/lvm/vgdisplay10.png" alt="vg" class="post-img post-img--left" style="max-width: 650px;">
1: VG’nin adı.

2: Grubun ait olduğu sistem kimliği. Genelde küme (cluster) ortamlarında kullanılır o yüzden boş.

3: Standart LVM sürümü.

4: Bir VG’nin yapılandırma bilgileri metadata olarak adlandırılır.Bu metadata, LVM’deki hangi LV’nin ne kadar büyüklükte olduğu, hangi PE’lerin nerede tutulduğu, UUID’ler, isimler gibi genel yapılandırma bilgilerini bulunduruyor. Varsayılan olarak metadata, VG içerisinde bulunan tüm PV’lerin kendi metadata alanlarına kopyalanarak saklanır. Bu konu hakkında ihtiyacımız dışında fazla detaya girmek istemiyorum. Detaylarına kaynaklar kısmından bakabilirsiniz. 

5:VG’de her işlem yapıldığında 1 artan revizyon numarası. 

6: Varsayalın değer olarak LV oluşturabilir, silebilir ve boyutlandırabilirsiniz. “read-only” olarak ayarlandığında LV oluşturma, silme ve genişletme gibi hiçbir işlemi yapamazsınız.

7: Boyutlandırabilir olarak işaretlenmiş sabit değer. Çok nadir durumlar dışında değişmez o yüzden detaylandırmayacağım.

8: VG’nin içinde oluşturulabilecek LV sayısı. 0 değeri sınırsız anlamına geliyor.

9: VG’nin içindeki LV sayısı. 0 çünkü henüz LV oluşturmadık

10: Kullanımda olan LV sayısı 0.

11: VG’ye eklenebilecek PV sayısı. 0 değer sınırsız anlamında.

12: VG’deki PV sayısı

13: VG’deki aktif PV sayısı.

14: GiB cinsinden VG’nin boyutu. Bu değer birazdan diğer PV'miz olan `/dev/sdc1`'i eklediğimizde artacak.

15: PE (Physical Extent) boyutu. Varsayılan olarak 4 MiB.

16: VG'nin 4 MiB’lık 12799 adet bloktan oluştuğunu belirtiyor.

17: Tahsis edilmiş blok ve gibibayt sayısı. Henüz bir LV oluşturmadığımız için 0.

18: Tahsis edilebilir blok sayısı. 

19: Benzersiz Kimlik numarası. Daha önce anlattığım gibi bir PV’yi bir VG’ye eklediğimizde, LVM o PV’nin üzerine VG’nin UUID’sini yazar. Böylece PV ismiyle değil, UUID’iyle hangi VG’ye ait olduğunu bilir. 

Aşağıda `pvs -o pv_name,pv_uuid,vg_name,vg_uuid` komutunun çıktısında gördüğünüz gibi `/dev/sdb1` UUID’si üzerinden `vg_base` grubuna işaret ediyor.
<img src="/assets/images/lvm/uuid.png" alt="point" class="post-img post-img--left" style="max-width: 750px;">
Şimdi /dev/sdc1 PV’sini vgextend komutu ile oluşturduğumuz VG’ye ekleyelim.

Kullanım: `vgextend <vg_adı> <pv_adı>`

Komut: `vgextend vg_base /dev/sdc1`
<img src="/assets/images/lvm/vgextend.png" alt="vgextend" class="post-img post-img--left" style="max-width: 650px;">
Tekrar `vgdisplay` komutunu kullanarak VG’nin boyutunun arttığını görebiliriz. `Cur PV` ve `Act PV` sayısı ikiye yükseldi.
<img src="/assets/images/lvm/okey.png" alt="volume" class="post-img post-img--left" style="max-width: 650px;">
Artık PV’lerimiz aynı havuzda. PV UUID’leri `vg_base` adlı VG’mizin VG UUID’sine işaret ediyor.
<img src="/assets/images/lvm/vguuid.png" alt="havuz" class="post-img post-img--left" style="max-width: 650px;">
## Hacim Grubu'ndan Mantıksal Hacim Oluşturma
Bu aşamada `lvcreate` komutunu kullanarak `vg_base adlı` VG'mizden, üzerinde dosya sistemi oluşturabileceğimiz bir Mantıksal Hacim (LV) oluşturacağız.

Kullanım: `lvcreate -L <boyut> [M|G|T] -n <lv_adı> <vg_adı>`

Komut: `lvcreate -L 25G -n lv_data1 vg_base`

Bu komutta istediğimiz miktarı `-L` ile byte cinsinden, `-l` ile yüzdelik veya blok cinsinden belirliyoruz. Genelde blok cinsinden belirtilmese de bilmekte fayda var. `-n` ile oluşturmak istediğimiz LV’nin adınıbelirledikten sonra bu hacmin hangi VG’den oluşturulacağını belirtiyoruz. 

`lvdisplay` komutunu kullanarak oluşturduğumuz LV'yi inceleyebilirsiniz.
<img src="/assets/images/lvm/lvdisplay1.png" alt="lvdisplay" class="post-img post-img--left" style="max-width: 650px;">
1: LV'ye erişim yolu (device path). Dosya sistemi ekledikten sonra LV’yi bu yolu kullanarak mount edeceğiz.

2: LV’adı

3: Bu LV’nin bağlı olduğu VG ismi.

4: Sistemdeki her LV için benzersiz kimlik numarası.

5:  LV üzerinde okuma/yazma yapılabiliyor. LV’nizi read-only olarak ayarlayabilirsiniz.

6: LV'nin hangi host'ta ve ne zaman oluşturulduğu bilgisi.

7: LV aktif ve kullanıma hazır.

8: LV aktif ama şuan mount edilmemiş, kimse kullanmıyor.

9: LV’nin toplam boyutu.

10: LV’yi oluşturan Logical Extend (Mantıksal Blok) sayısı. Toplam 6400 adet 4MiB’lik bloklardan oluşuyor.

11: LV’nin kaç parçadan oluştuğunu gösteriyor. Disk üzerinde tek parça halinde yani bölünmemiş. Bu kısmı daha sonra açıklayacağım.

12: Tahsis kuralları, VG’den almış yani özel bir ayar yok. Genelde bu şekilde.

13: Okuma öncesi (read-ahead) ayarı otomatik belirleniyor.

14: Otomaik ayarın şu anki gerçek "read-ahead" değeri, 256 sektör. Önemli bir detay değil.

15: Kernel içindeki major:minor numarasını gösteriyor. Kernel seviyesinde çalışma zamanında atanan kimlik.

Şimdi 50GB'lık `lv_data2` LV'sini oluşturalım.

`lvcreate -L 50GB -n lv_data2 vg_base`
<img src="/assets/images/lvm/lvdata2.png" alt="lvdata2" class="post-img post-img--left" style="max-width: 650px;">
`vgdisplay` komutu ile VG'mizin güncel halini inceleyelim.
<img src="/assets/images/lvm/vgd5.png" alt="vgdisplay2" class="post-img post-img--left" style="max-width: 650px;">
1: VG’deki LV sayısı.

2: LV’lerin kaç tanesinin açık/kullanımda olduğunu gösteriyor. Oluşturduğumuz LV’lere henüz bir dosya sistemi ekleyip mount etmediğimiz için şimdilik 0.

3: VG’mizin toplam boyutu. 50 ve 100GB olmak üzere 2 PV eklemiştik.

4: 150GB’lık bu havuzun 75GB’ı kullanılıyor. 25 ve 50GB’lık 2 LV oluşturduk.

5: VG’de kalan boş alan.

lsblk komutu ile dağılımı görebiliriz.
<img src="/assets/images/lvm/lsblk.png" alt="lsblk" class="post-img post-img--left" style="max-width: 650px;">
Burada farkedebileceğiniz gibi, varsayılan olarak LVM bir LV oluştururken rastgele veya sırayla PV seçmiyor. Oluşturulmak istenen PV’nin boyutuna en uygun PV’yi seçiyor. Örneğin:

25GB’lık LV > 50 GB’lık PV’den oluşturulmuş.

50GB’lık LV > 100 GB’lık PV’den oluşturulmuş.

Yani LVM, önce bir PV’yi tamamen doldurup taşan kısmı başka bir PV’ye parçalamak (birazdan anlatacağım *segment* konusu) yerine, VG içindeki PV’ler arasından LV’yi tek parça halinde barındırabilecek en uygun olanı seçiyor. Bu LVM’in varsayılan davranışı. Red Hat’in resmi dokümantasyonuna göre bu ayarı değiştirmemeniz tavsiye ediliyor.

Eğer 125 GB’lık bir LV oluşturmuş olsaydık bu boyutta bir PV olmadığı için LV aşağıda gördüğünüz gibi normal olarak parçalara ayrılacaktı.
<img src="/assets/images/lvm/test.png" alt="test" class="post-img post-img--left" style="max-width: 650px;">
Örnek olarak oluşturduğum bu LV’ye `lvdisplay` komutu ile bakalım.
<img src="/assets/images/lvm/vgs5.png" alt="segment" class="post-img post-img--left" style="max-width: 650px;">
1: Bu kısmı daha sonra açıklayacağımı söylemiştim. `Segments` alanı, LV’nin disk üzerinde hangi PV’lerde, hangi alanlarda durduğunu gösterir. Gördüğünüz gibi VG’mizdeki PV’lerin hiçbiri 125GB boyutunda olmadığı için, LV’miz 2 parçaya bölünmüş durumda. LV her zaman fiziksel olarak bitişik olmak zorunda değildir; bu şekilde parçalı da olabilir. Her bitişik parçaya *segment* diyoruz.*Segment* sayısı 1 ise LV tek parça halinde, bitişik alanda duruyor demek. Tercih edilen temiz yerleşim budur.

*Segment* birden fazla ise LV farklı PV’lere yayılmış demek. PV boyutlarının yetersiz olduğu bu gibi durumlarda LV’ler doğal olarak parçalara (*segment*) bölünebilir. Ancak birazdan başka bir örnekte göstereceğim gibi, istenmeyen parçalı yerleşim, HDD kullanılan ortamlarda disk kafasını daha fazla hareket ettireceğinden tercih edilmez. 

LV’nin doğal olarak parçalara bölündüğü durumunların dışında birden fazla *segment* sayısı görmeniz her zaman olumsuz bir durum anlamına gelmez. Örneğin yine ilerleyen kısımlarda anlatacağım üzere LVM’in şeritleme (striping) veya anlık görüntü (snapshot) gibi özelliklerini kullandığınızda da bu sayı  artar.
## Dosya Sistemi Oluşturma ve Bağlama
LVM sürecinin sonunda LV’lerimize `mkfs` komutu ile dosya sistemi ekleyip sisteme bağlayarak (mount) kullanmaya başlayabiliriz.

Kullanım: `mkfs.<dosya_sistemi_türü> <cihaz_yolu>`

Dosya sistemlerini oluşturmadan önce kısa bir hatırlatma:

`ext4` dosya sistemi masaüstü kullanım veya küçük boyutlu sistemler için idealdir. Boyutu küçültülebilirdir.

`xfs` dosya sisteminin boyutu küçültülemez. Yani bir LV’nin boyutunu büyütebilirsiniz fakat küçültmek isterseniz LV’nizi silip baştan oluşturmanız gerekir. Bu yüzden dikkatli olmalısınız.

Şimdi dosya sistemlerini oluşturalım.

Komut 1: `mkfs.ext4 /dev/vg_base/lv_data1`

Komut 2: `mkfs.xfs /dev/vg_base/lv_data2`

LV’lerimizde dosya sistemi oluşturduktan sonra `blkid` komutuyla kontrol edelim.

Komut 1: `blkid /dev/vg_base/lv_data1`

Komut 2: `blkid /dev/vg_base/lv_data2`
<img src="/assets/images/lvm/blkid10.png" alt="blkid" class="post-img post-img--left" style="max-width: 650px;">
Bağlama noktaları (mount points) oluşturalım.

Komut 1: `mkdir /data1`

Komut 2: `mkdir /data2`

Dosya sistemli LV'lerimizi bu noktalara bağlayalım.

Komut 1: `mount /dev/vg_base/lv_data1 /data1`

Komut 2: `mount /dev/vg_base/lv_data2 /data2`

Tekrak `lsblk` komutunu kullanarak UUID'leri öğrenelim.
<img src="/assets/images/lvm/lsblk2.png" alt="lsblk2" class="post-img post-img--left" style="max-width: 650px;">
Artık LV’ler kullanılmaya hazır. Bağlantı noktalarının kalıcı olması için LV UUID’lerini `/etc/fstab` dosyasına ekleyeceğiz. Tekrar `blkid` komutunu kullanrak LV’lerimizin UUID’sini öğrenelim.
<img src="/assets/images/lvm/blkid12.png" alt="blkid2" class="post-img post-img--left" style="max-width: 750px;">
UUID’leri kopyalayın ve aşağıda gördüğünüz şekilde `/etc/fstab` dosyasının en altına ekleyin.
<img src="/assets/images/lvm/vimetc.png" alt="etc" class="post-img post-img--left" style="max-width: 800px;">
 Artık sistem her açıldığında LV’lerimiz otomatik olarak bu klasörlere bağlanacak.

## Disk Dolma Senaryosu: /data1
Şimdi /data1 üzerinde log dosyalarının diski doldurma senaryosunu tekrar simule edeceğiz. Bu test için kullanacağımız komut:
`cat /dev/zero > /data1/application_1.log`

Aşağıda LV’nin doluşunu görebilirsiniz.
{% include video-loop.html src="/assets/videos/lvm/disk_dolumu2.mp4" class="video-loop--medium" %}
Artık sistemimizde LVM kullandığımıza göre depolama alanımızın boyutunu genişleterek bu sorunu çözebiliriz. LV boyutunu genişletmek için kullanılan komut `lvextend`.

Kullanım 1: `lvextend -l +100%FREE <lv_path>` VG'deki tüm boş alanı kullanır.

Kullanım 2: `lvextend -L 50G <lv_path>` LV'yi belirli bir boyuta genişletir.

Kullanım 3: `lvextend -L +50G <lv_path` LV'ye belirli bir miktar ekler.

Şimdi LV'mizin boyutunu genişletelim.

Komut: `lvextend -L +24G /dev/vg_base/lv_data1`
<img src="/assets/images/lvm/extend.png" alt="exnted" class="post-img post-img--left" style="max-width: 650px;">
25GB yerine 24GB kullanmamın sebebi, şuan genişlettiğimiz `lv_data1`, 50GB’lık `/dev/sdb1` PV’si üzerinde duruyor. İlk bakışta LV’ye 25GB daha ekleyerek 50GB’lık PV’nin hepsini kullanmayı düşünebilirsiniz. Fakat gerçekte `/dev/sdb1`’in LVM için kullanılabilir (allocatable) boyutu tam olarak 50GB değil, yaklaşık 49.5GB’dır. Yani eğer 24 yerine 25GB’lık bir genişletme yapsaydım kalan 500 MB’ın başka bir diske bölündüğünü (*segment*) görecektik. Bu da aşağıda gördüğünüz gibi karmaşıklığa neden olur ve yönetimi zorlaştırır.
<img src="/assets/images/lvm/disktest.png" alt="disktest" class="post-img post-img--left" style="max-width: 650px;">
Bu yüzden bir LV’yi genişletirken üzerinde bulunduğu PV’den başka disklere bölünmesini istemiyorsanız bu duruma dikkat edin. 

`df -h /data1 /data2` komutu ile LV'lerimizin boyutunu kontrol edelim.
<img src="/assets/images/lvm/dfh.png" alt="disktest" class="post-img post-img--left" style="max-width: 650px;">
Fark ettiğiniz gibi, LV’ye 25 GB daha eklememize rağmen boyutu artmadı ve 50GB yerine hala 25GB olarak görünüyor.
Bunun sebebi  `lvextend` komutu sadece LV’yi büyütür, üzerindeki dosya sisteminin boyutunu değiştirmez. Bu yüzden `lvextend` komutunu kullandıktan sonra dosya sistemini de genişletmeniz gerekiyor. Bu işlem için kullanılan komutlar:

XFS dosya sistemini genişletmek için: `xfs_growfs`

EXT4 dosya sistemini genişletmek için: `resizefs`

LV'mizin dosya sistemini genişletelim.

`resize2fs /dev/vg_base/lv_data1`
<img src="/assets/images/lvm/resize.png" alt="resize" class="post-img post-img--left" style="max-width: 650px;">
Tekrar `df -h /data1 /data2` komutunu kullanarak boyutu kontrol edelim.
<img src="/assets/images/lvm/dfh10.png" alt="resize" class="post-img post-img--left" style="max-width: 650px;">
Gördüğünüz gibi dosya sistemini genişlettikten sonra LV’mizin boyutu 50GB’a yükseldi. 

## Disk Dolma Senaryosu: /data2
Bu kısımda `/data1`'de yaptığımız gibi, `/data2`’nin de boş alanını dolduracağız. Bu defa `lv_data2` LV’sinin boyutunu 150GB olarak büyüterek disk dolma sorununu çözmek istiyoruz. Fakat VG’mizde yeterli yer yok. Bu yüzden sisteme yeni bir disk ekledik ve VG’nin boyutunu büyüteceğiz. LV’mizin boyutunu 150GB yapacağız ve son olarak dosya sistemini de genişleterek süreci tamamlayacağız.

Önceki bölümlerden bildiğiniz komutları kullanacağız ve aynı aşamaları takip edeceğiz. Bu örneğin amacı VG’de boş alan kalmadığında LV’mizin boyutunu büyütme sürecini göstermek.

Şimdi `cat /dev/zero > /data2/application_2.log` komutunu kullanarak boş alanı dolduralım.
<img src="/assets/images/lvm/data2.png" alt="data2" class="post-img post-img--left" style="max-width: 650px;">
`/data2`’nin bağlı olduğu `lv_data2`’nin boyutunu 150GB olarak genişletmek istiyoruz fakat VG’de sadece 50GiB yer kaldığını aşağıda görebilirsiniz.
<img src="/assets/images/lvm/bospace.png" alt="bospace" class="post-img post-img--left" style="max-width: 650px;">
Bu sorunu çözmek için sistemimize 150GB’lık `/dev/sdd` diskini ekledik ve `lsblk` komutu ile kontrolünü yapıyoruz.
<img src="/assets/images/lvm/sdd3.png" alt="sdd3" class="post-img post-img--left" style="max-width: 650px;">
`pvcreate` komutu ile diskimizi VG’de kullanmak için PV’ye çevirmeden önce, hatırlayacağınız gibi ilk önce bütün diski kaplayan bir bölüm (partition) oluşturuyoruz. Bu aşama önceki kısımlarda anlattığım süreçle aynı olduğu için disk bölümleme işlemini göstermeyeceğim. İsterseniz aşamaları "İçerik" panelinden “Disk Bölümleme” yazısına tıklayarak tekrar inceleyebilirsiniz.

Aşağıda gördüğünüz gibi bütün diski kaplayan bir bölüm oluşturduk.
<img src="/assets/images/lvm/butundisk.png" alt="sdd3" class="post-img post-img--left" style="max-width: 650px;">
Şimdi bu bölümü PV’ye dönüştürelim.

`pvcreate /dev/sdd1`
<img src="/assets/images/lvm/devsdd.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
VG’mizin boyutunu `vgextend` komutu ile oluşturduğumuz PV’yi ekleyerek büyütüyoruz. Tekrar hatırlatmak için:

Kullanım: `vgextend <vg_adı> <pv_path>`

Komut: `vgextend vg_base /dev/sdd1`
<img src="/assets/images/lvm/vgextenddd.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
`vgdisplay` komutu ile VG’mizin yeni boyutuna bakalım.
<img src="/assets/images/lvm/yenispace.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
Yeni PV'mizi ekledikten sonra toplam alan 150 GiB’den 299.99 GiB’e yükseldi. Artık `lv_data2` LV’mizin boyutunu büyütmek için bu alanı kullanabiliriz.

Komut: `lvextend -L 150G /dev/vg_base/lv_data2`
<img src="/assets/images/lvm/logical.png" alt="devsdd" class="post-img post-img--left" style="max-width: 825px;">
`lvextend` komutunu kullanıp LV’mizin boyutunu büyüttükten sonra dosya sistemini genişletmemiz gerekiyor demiştim. Önceki aşamada kullandığımız `resize2fs` komutunu kullanmamalıyız çünkü `lv_data2` XFS dosya sistemi kullanılıyor. Dosya sistemi tipini `blkid` ile öğrenebilirsiniz.
<img src="/assets/images/lvm/blkidata2.png" alt="devsdd" class="post-img post-img--left" style="max-width: 825px;">
Bu yüzden kullancağımız komut `xfs_growfs`

`xfs_growfs /dev/vg_base/lv_data2`
<img src="/assets/images/lvm/grow.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
XFS dosya sistemini genişlettik. Aşağıda `/data2`’nin boyutunun arttığını görebilirsiniz.
<img src="/assets/images/lvm/xfsgroww.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">  
Buraya lvreduce disk boyutu küçültmeyi göster.

## Disk Bozulma Senaryosu
Şimdi `/data1`'e mount edilen `lv_data1` LV'sinin bulunduğu `/dev/sdb` diskinin bozulmaya başladığını varsayalım. Bu durumda akla ilk gelen çözüm, önerildiği gibi `/data1`'i read-only moduna geçirerek taşıma işlemini `mv` komutuyla başlatmak olabilir. Fakat bu yöntem bildiğiniz gibi kesintiye yol açar. Ayrıca `mv` gibi dosya sistemi seviyesinde çalışan komutlar taşıma sırasında elektrik kesintisi veya disk hatası gibi bir sorunla karşılaşırsa işlem yarıda kalır ve hangi dosyaların taşındığını, hangilerinin taşınmadığını elle kontrol etmeniz gerekir. Otomatik devam veya geri alma mekanizması yoktur. Bununla birlikte disk üzerinde birden fazla LV varsa `mv` komutu ile dosyaları taşımak diski VG'den çıkarmayacağından, diskteki diğer LV'ler hala o bozuk disk üzerinde kalmaya devam ederler.

Bu nedenle bozulmaya başlayan diskimizi VG'den çıkarmadan önce LV ve verilerini güvenli bir şekilde taşımak için `pvmove` komutunu kullanacağız. `pvmove` komutu, `mv` aksine blok seviyesinde çalışır. Yani dosya sisteminin ne olduğuyla veya içindeki dosyalarla hiç ilgilenmez. LVM'in PE'lerini bir PV'den başka bir PV'ye taşır. Aslında yapılan işlem bir "dosya taşıma" değil, LV'nin fiziksel olarak nerede durduğunu değiştirme işlemidir. `pvmove`, kaynak ve hedef arasında geçici bir *mirror* (RAID gibi) oluşturarak *segment* şeklinde taşır. Her *segment* tamamlandığında ilerleme VG metadata'sına *checkpoint* olarak yazılır. Bu işlem LV mount'luyken ve servisler çalışırken arka planda yürütülür. Yani veriyi taşımak için diski *unmount* etmenize ve kesinti yaşamanıza gerek kalmaz. İşlem sırasında sistem çökerse veya disk hata verirse, LVM bunu yarım kalmış `pvmove` olarak kaydeder ve komutu tekrar çalıştırdığınızda kaldığı yerden devam eder çünkü hangi PE'lerin taşınıp, hangilerinin taşınmadığı LVM tarafından bilinir. Böylece her şey korunur. Bu detayları açıkladığıma göre artık başlayabiliriz. 

`/dev/sdb` diskinin bozulmaya başladığını fark ettik. Bu diskte `/dev/sdb1` adlı PV oluşturmuştuk. Yani `/dev/sdb1` PV'si üzerindek tüm LV'ler ve verileri risk altında. Bu yüzden yeni eklediğimiz `/dev/sdd` diskinden oluşturduğumuz `/dev/sdd1` PV'sine bu LV'leri güvenli bir şekilde taşımak istiyoruz. İlk olarak `/dev/ssd1`'de yeterli alanın olup olmadığını `pvs` komutu ile kontrol edelim.
<img src="/assets/images/lvm/pvs2.png" alt="3disk" class="post-img post-img--left" style="max-width: 650px;">
Gördüğünüz gibi `/dev/sdd1` PV'sinde yeterince yer var. Başlamadan önce hangi LV'lerin hangi PV'leri kullandığını `pvs --segments -o pv_name,pv_size,lv_name,seg_size --units -g` komutu ile görelim.
<img src="/assets/images/lvm/pvsoption.png" alt="pvsoption" class="post-img post-img--left" style="max-width: 650px;">
Önerilen yöntem olarak `vgcfgbackup vg_base` komutu ile VG'mizin LVM yapılandırma bilgisini yedekleyelim.
<img src="/assets/images/lvm/vgbackup.png" alt="vgbackup" class="post-img post-img--left" style="max-width:5550px;">
Şimdi `pvmove` komutunu kullanarak işleme başlayalım.

Kullanım: `pvmove <kaynak_pv> <hedef_pv>`

Komut: `pvmove /dev/sdb1 /dev/sdd1`
<img src="/assets/images/lvm/pvmoved.png" alt="pvmoved" class="post-img post-img--left" style="max-width: 650px;">
Aktarma tamamlandıktan sonra tekrar `pvs --segments -o pv_name,pv_size,lv_name,seg_size --units -g` komutunu kullanarak güncel hale bakalım.
<img src="/assets/images/lvm/pvsfinal.png" alt="pvmoved" class="post-img post-img--left" style="max-width: 650px;">
Gördüğünüz gibi artık `/dev/sdb1` PV'sini hiçbir LV kullanmıyor. `lv_data1` LV'si tamamen `/dev/sdd1` PV'sine taşınmış durumda.
Aktarma işlemi tamamlandıktan sonra bozulmaya başlayan diskten oluşan `/dev/sdb1` PV'sini VG'den çıkarabilirz. Kullanacağımız komut `vgreduce`

Kullanım: `vgreduce <vg_adı> <pv_adı>`

Komut: `vgreduce vg_base /dev/sdb1`
<img src="/assets/images/lvm/vgreduce.png" alt="pvmoved" class="post-img post-img--left" style="max-width: 550px;">

PV'mizi VG'den çıkardıktan sonra, diskimizi artık PV statüsünden çıkarabiliriz.
<img src="/assets/images/lvm/pvremove2.png" alt="pvremve" class="post-img post-img--left" style="max-width: 650px;">
Artık işlemimizi tamamladık ve diskimizi *unmount* etmeden veya *read-only* moduna geçirmeden canlı bir şekilde diskteki tüm LV'leri (Birden fazla LV'miz olsaydı aynı adımlar geçerli olurdu.) ve verilerini taşıdık.
## LVM Striping
LVM striping konusunu anlatmadan önce, LVM kullanarak RAID oluşturmaktan bahsetmeliyim. Fiziksel disklerinizi PV'ye dönüştürdükten sonra LVM'in RAID özelliğini kullanarak PV'lerinizden 0,1,4,5,6 ve 10 seviyelerinde RAID oluşturabilirsiniz. Fakat yaygın pratikte önce RAID oluşturmak, ardından bu RAID cihazını LVM'e PV olarak eklemek tavsiye ediliyor. Yani disk arıza yönetimi ve yedeklilik takibini LVM ile yönetmek yerine, sadece bu iş için tasarlanmış `mdadm` komutunu kullanarak RAID oluşturmak daha doğru bir yaklaşım. Böylece RAID yönetimi `mdadm`, hacim yönetimi ise LVM tarafından yönetiliyor.

Bu nedenle bu bölümde LVM'in RAID özelliklerini kapsamlı bir şekilde ele almak yerine, RAID'in yedekleme sağlamayan ve LVM'de en çok tercih edilen kullanım senaryosuna odaklanacağız. Disk performansını arttırmaya yarayan RAID 0 (striping) yöntemi.

Sistemimize `/dev/sde` 50GB ve `/dev/sdf` 50GiB olmak üzere 2 disk ekledik. Bu diskleri PV'ye dönüştürüp LVM'e dahil ederek RAID 0 (striping) yapılandırmasıyla bir LV oluşturacağız.
Öncelikle disklerimi görelim.
<img src="/assets/images/lvm/yenidiskler.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 650px;">
Disklerimizi PV oluşturmak üzere bölümleyelim. Bu işlemini "İçerik" kısmından "Disk Bölümleme" kısmından inceleyebilirsiniz. `lsblk /dev/sde /dev/sdf` komutunun çıktısı bu şekilde olmalı:
<img src="/assets/images/lvm/lsblknew.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 650px;">
`pvcreate /dev/sde1 /dev/sdf1` komutunu kullanarak PV'lerimizi oluşturuyoruz.
<img src="/assets/images/lvm/pvler1.png" alt="yenidiskler" class="post-img post-img--left" style="max-width 450px;">
Kontrolün kolay olması için önceki aşamalarda oluşturduğumuz `vg_base` adlı VG'den ayrı olarak `vg_stripe` adında yeni bir VG oluşturacağız. Tekrar hatırlatmak için:

Kullanım: `vgcreate <vg_adi> <pv_path>`

Komut: `vgcreate vg_stripe /dev/sde1 /dev/sdf1`

Bu komutu çalıştırdıktan sonra `vgs` komutuyla VG'mizi kontrol edelim.
<img src="/assets/images/lvm/vgs.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 650px;"> 


Şimdi `vg_stripe` VG'sindeki boş alanın tamamını kullanarak RAID 0 yapılandırmasında `lv_stripe` adında yeni bir LV oluşturacağız.

Kullanım: `lvcreate --type <raid_türü> -i <stripe_sayısı> -I <stripe_boyutu> -l <lv_boyutu> -n <lv_adı> <vg_adı>`

Komut: `lvcreate --type raid0 -i 2 -I 64 -l 100%FREE -n lv_stripe vg_stripe`
<img src="/assets/images/lvm/lvcreateyenidisk.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
`--type raid0`: Oluşturulacak LV'nin tipini belirtiyor.

`-i 2`: Stripe sayısı. Verinin kaç fiziksel disk/PV üzerinde bölüneceğini belirtir. Veriler 2 PV üzerine yani `/dev/sde1` ve `/dev/sdf`'ye sırayla dağıtılacak.

`-I 64`: Stripe boyutunu belirtir. Yani stripe'ın 64 KiB olması, verinin bu boyutlarda bir diske yazıldıktan sonra diğer diske geçmesi anlamına geliyor. 

`-l 100%FREE`: LV'ye ayrılacak alan. Yani `vg_stripe` VG'mizdeki tüm alanı kullanıyoruz.

`-n lv_stripe`: LV adı.

`vg_stripe`: LV'nin oluşturulacağı kaynak VG.

LV'mizi oluşturduktan sonra `lsblk /dev/sde /dev/sdf` komutu ile `lv_stripe`'i inceleyelim.
<img src="/assets/images/lvm/lvstripe.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
100GiB boyutunda `lv_stripe` adlı LV'miz RAID 0 yapılandırılmasıyla 2 fiziksel disk üzerine dağılmış durumda. Yukarı gördüğünüz `rimage_0` ve `rimage_1`, LVM RAID'in her stripe/disk için oluşturduğu alt-LV bileşenleridir. Doğrudan müdahele gerektiren bir şey değil yani detaylarına ihtiyacımız yok.

`lv_stripe` üzerinde bir dosya sistemi oluşturalım.

Komut: `mkfs.xfs /dev/vg_stripe/lv_stripe`

LV'mizi kullanabilmek için bir bağlama noktası (mount point) oluşturup buraya bağlayalım:

Komut1: `mkdir /striped`

Komut2: `mount /dev/vg_stripe/lv_stripe /striped`

<img src="/assets/images/lvm/lvmstriped2.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">

Artık `lv_stripe` adlı LV'miz `/striped` adlı klasöre bağlandığına göre kullanıma hazır. (Bu noktanın kalıcı olması için `/etc/fstab` dosyasına ekleme yapmayı unutmayın.) 

Şimdi yukarıda gördüğünüz ekteki `/dev/sdd1` üzerine kurulu olan `lv_data1` LV'si ile yeni oluşturduğumuz `lv_stripe`'ı yazma hızı olarak karşılaştırarak RAID 0 (striping)'in sağladığı performans avantajını görelim. 

Bu noktada belirtmem gereken önemli bir nokta var. Bu işlemi benim yaptığım gibi bir sanal makine (VM) üzerinde yapıyorsanız, `fio` testinde beklediğimiz yazma hızı farkını göremeyeceksiniz. Bunun sebebi, VM'e eklediğimiz disklerin (`/dev/sdd`,`/dev/sde`) sanal olması ve arka planda hala ana makinenin (host) tek bir fiziksel diski paylaşmasıdır. Yani LVM seviyesinde RAID 0 yapılandırmasını doğru şekilde kurmuş olsak da, bu sanal diskler fiziksel olarak aynı temel disk üzerinde bulunduğu için gerçek bir paralellik sağlamıyor ve striping'in asıl performans kazancını VM ortamında ölçemiyoruz.

VM kullanmadığımız bir durumda `fio` testinin sonucunda iki LV arasındaki fark bu şekilde olurdu:

`lv_data1` yazma hızı.
<img src="/assets/images/lvm/readwritenormal.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;"> 
`lv_stripe`yazma hızı.
<img src="/assets/images/lvm/readwritestripe.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
Gördüğünüz üzere LVM RAID 0 ile yapılandırılmış LV'de okuma/yazma hızı ortalama olarak 2 katına çıkıyor. Unutmayın ki RAID 0 yedeklilik sağlamıyor. Bu yüzden yedeklilik gerektiren durumlarda RAID 1,2,4,6 ve 10 seviyelerinden birini kullanmalısınız. Tahmin edebileceğiniz üzere tüm RAID seviyelerini anlatmam bu yazıyı fazlasıyla uzatacağından, LVM'in RAID desteğini sadece striping yapılandırması ile göstermek istedim. Diğer seviyelerin detayları için kaynaklar bölümüne bakabilirsiniz.


