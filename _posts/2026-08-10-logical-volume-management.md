---
title: "Logical Volume Management"
tags: [lvm]
cover: /assets/images/cover-lvm.jpg
---
Logical Volume Management (LVM) konusunu anlatmaya başlamadan önce kısaca bu yazının ortaya çıkma sebebinden ve içeriğinden bahsetmek istiyorum. İnternette LVM hakkında bir çok yazı bulunsa da, konuyu araştırmaya başladığım sürede okuduğum bazı yazıların ortak özelliği yeterince açıklayıcı veya kapsamlı olmamasıydı. Bu yüzden öğrendiklerimi, bu konunun temeli olan fiziksel disklerden en üst katmanına kadar bir bütün şeklinde açıklayarak bu yazıda toplamak istedim. İlk olarak LVM’siz bir sistemde oluşan bir duruma göz atacağız. Sonrasında ise LVM ne olduğunu ve yapısını açıklayarak bu durumu nasıl çözdüğünü ve diğer avantajlarını anlatacağım.

## Log Dosyalarının Diski Doldurması

Öncelikle LVM’siz bir sistemde depolama alanı dolduğunda oluşan duruma bakalım. Sistemin `lsblk` komutu ile görüntüsü şu şekilde:
![lsblk komutu çıktısı](/assets/images/lvm/lsblk_cikti.png)

Aşağıdaki ekte sisteme yeni eklenmiş 20 GB’lık bir depolama birimi (/dev/sdb) bulunuyor. Bu depolama birimi /dev/sdb1 ve /dev/sdb2 olarak 10 GB’lık bölümlere ayrılmış. /data1 ve /data2’ye mount edilen bu iki bölüm uygulamaların log dosyalarını kaydetmek için oluşturulmuş.
![lsblk komuut çıktısı2](/assets/images/lvm/2_lsblk.png)

Gerçek hayatta karşılaşılan sorunlardan birisi olan, log dosyalarının diskteki alanını tüketmesini simule edelim. Bu komut diski hızlıca dolduracağındankendi sistemlerinizde denemeyin.

`cat /dev/zero > /data1/application.log`

`cat /dev/zero > /data2/application.log`

Aşağıdaki diagramda LVM’siz bir sistemi ve watch df -h komutu ile yaptığımız işlemi daha net görebilirsiz. Log dosyalarının diskteki alanı tüketmesini simule ediyoruz ve disk bu komuttan sonra dolmaya başlıyor.
{% include video-loop.html src="/assets/videos/lvm/diskdolumu.mp4" %}

Bu durumda tabiki log dosyalarını başka bir diske taşımayı veya silmeyi tercih edebilirsiniz. Fakat bu süreç tahmin edebileceğiniz gibi disk sayısı arttıkça zorlaşır. Bu durumda LVM kullanarak dosya sisteminizi genişletebilirdiniz veya farklı şekillerde bu sorunu çözebilirdiniz. Fakat yukarıda gördüğünüz sistemde LVM kullanılmadığı için, dosya sisteminizi genişletemezsiniz. Şimdi bu gibi bir çok sorunu çözen ve bir çok avantaj sağlayan LVM’i açıklayıp nasıl kullanacağımızı anlatacağım.

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
LVM’i ve yapısını açıkladığıma göre, konuyu daha iyi anlamanız için diagram ve animasyonlarla bir senaryo üzerinden LVM konfigürasyonu yapacağım. Senaryomuz şu şekilde:

Sisteme yeni eklenen 50 GB ve 100GB  olmak üzere 2 adet disk bulunmakta. Daha önce anlattığım “log dosyalarının diski doldurması” sorununa çözüm olarak bu diskleri LVM ile yönetmeye karar veriyoruz.
Bu diskleri ilk önce PV’ye dönüştürüp, sonrasında LVM’e dahil edeceğiz. Ardından bu PV’leri, VG dediğimiz ortak bir havuzda birleştireceğiz. Bu havuzdan 25GB ve 50GB olmak üzere 2 adet Mantıksal Hacim (LV) oluşturacak ve üzerlerine dosya sistemi kurarak /data1 ve /data2 konumlarına mount edeceğiz.

Kurulumu tamamladıktan sonra, /data1 üzerinde log dosyasının diski doldurması senaryosunu tekrar simule edeceğiz. Çözüm olarak LV’nin ait olduğu VG’deki boş alanı kullanarak doğrudan LV’mizin boyutunu büyüteceğiz.
Sonrasında /data2’nin de boş alanını dolduracağız. Bu LV’nin boyutunu 150GB olarak genişletmeyi istediğimizde VG’de boş alanın kalmadığını göreceğiz.
Çözüm olarak önce 3. bir diski VG’ye ekleyip havuzu genişletecek ve sonrasında /data2'yi büyüteceğiz. Daha sonra LVM’in diğer özelliklerini göstereceğim.
## Açıklamalı LVM Konfigürasyonu
İlk olarak `lsblk` komutu ile yeni diskleri görelim.
![diskler](/assets/images/lvm/diskler.png)

Fiziksel Diskleri, PV’ye dönüştürmeden önce şundan bahsetmeliyim. Fiskleri diskleri bölümlemeden (partition) direkt LVM’e eklemek mümkün. Diğer şekilde disk bölümlerinden PV oluşturup LVM’e eklemeniz de mümkün. Fakat Red Hat dokümantasyon sitesinde yazdığına göre genellikle bütün bir diski kaplayan tek bir disk bölümü oluşturup, bu bölümü “Linux LVM” olarak  işaretlemek ve sonrasına PV’ye dönüştürmek tavsiye ediliyor. Bu yüzden diskleri doğrudan kullanmak yerine Red Hat önerilerine bağlı kalacağım. Bu detayı açıkladığıma göre devam edebiliriz.

## Disk Bölümleme
İlk olarak `fdisk` komutu ile yeni eklenen diskleri tek bir bölüm (partition) olacak şekilde bölümleyeceğiz ve Linux LVM olarak işaretleyeceğiz.
`fdisk /dev/sdb` komutunu çalıştırıp “n” yazın ve yeni bir partition oluşturma işlemine başlayın.

<img src="/assets/images/lvm/fdisk.png" alt="fdisk" class="post-img post-img--left" style="max-width: 650px;">

Şimdi "p" yazarak primary partition seçeneğini seçin. "Partition number" kısmına 1 yazın. Bu bölümlemede bütün diski kullanacağımız için "First sector" ve "Last Sector" seçeneklerini boş bırakarak geçebilirsiniz.
<img src="/assets/images/lvm/part.png" alt="part" class="post-img post-img--left" style="max-width: 650px;">
Diski Linux LVM olarak işaretlemek için “t” yazın. Seçenekleri görmek için “L” yazın.
<img src="/assets/images/lvm/toption.png" alt="toption" class="post-img post-img--left" style="max-width: 650px;">
Bölümü “8E” hex kodunu kullanarak Linux LVM olarak işaretleyin.
<img src="/assets/images/lvm/83.png" alt="83" class="post-img post-img--left" style="max-width: 650px;">
Yaptığınız değişiklileri “p” yazarak kontrol edin ve “w” ile kayderek çıkış yapın.
<img src="/assets/images/lvm/poption.png" alt="poption" class="post-img post-img--left" style="max-width: 650px;">
Bu işlemin aynısını /dev/sdc için tekrar edin. Diskler bu şekilde görünmeli:
<img src="/assets/images/lvm/diskler2.png" alt="diskler2" class="post-img post-img--left" style="max-width: 650px;">

## Fiziksel Disk bölümlerini Fiziksel Hacim'e Dönüştürme
Fiziksel Hacim (PV) oluşturmak için  `pvcreate` komutunu kullanıyoruz. Bölümü LVM'de kullanmak üzere PV'ye dönüştürmek için `pvcreate /dev/sdb1` komutunu çalıştırın.
<img src="/assets/images/lvm/pvcreate1.png" alt="pvcreate1" class="post-img post-img--left" style="max-width: 650px;">
Oluşturduğumuz PV'nin detaylarını görmek için `pvdisplay` komutunu kullanın.
<img src="/assets/images/lvm/pvdisplay.png" alt="pvdisplay" class="post-img post-img--left" style="max-width: 650px;">
1: PV’nin adı oluşturduğumuz Fiziksel diskin adı olan /dev/sdb1.<br>
2: VG Name boş çünkü henüz bu Fiziksel Hacmi bir Hacim Grubu’na eklemedik.<br>
3: PV Size 50 GiB Fiziksel Hacmin boyutunu belirtiyor. Buradaki “GiB” ile “GB”’ı karıştırmayın.<br>
4: Allocatable NO “çünkü Fiziksel Hacim henüz bir Hacim Grubu’na eklemedik.<br>
5 - 6 - 7 - 8: Bu kısmımda PE’nin ne olduğunu açıklayayım. PE (Physical Extent) yani Fiziksel Birim, Fiziksel Hacim (PV) üzerindeki en küçük depolama biriminidir. Fiziksel Hacim, Hacim Grubu’na dahil edildiğinde disk byte şeklinde değil, sabit boyutlu bloklara (extent) bölünerek yönetilir. Bu blokların boyutu 4 MiB. Yani bu Fiziksel Hacim’imiz henüz bir Hacim Grubu’na eklenmediği için henüz extentlere bölünmedi ve bu yüzden PE ile alakalı kısımlarda şimdilik 0 yazıyor.<br>
9:  Fiziksel Hacmin benzersiz kimlik numarasıdır. Bu UUID, /dev/sdb1 gibi bir diskin en başındaki LVM metadata alanına (header) yazılıyor. Yani UUID işletim sistemi tarafında değil, diskin kendi üzerinde fiziksel olarak taşınıyor. Diskin ismi, sırası değişse veya başka bir sunucuya geçse bile PV UUID sabit kalır. LVM yapısı, Fiziksel Hacim (PV), Hacim Grubu (VG) ve Mantıksal Hacim (LV) arasındaki ilişki, bu UUID'ler üzerinden çapraz referans (PV↔VG↔LV) yapılarak oluşur.

Şimdi /dev/sdc1 diskini Fiziksel Hacim’e dönüştürerek devam edelim.
