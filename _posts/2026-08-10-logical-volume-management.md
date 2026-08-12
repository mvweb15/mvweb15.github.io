---
title: "Logical Volume Management"
tags: [lvm]
cover: /assets/images/cover-lvm.jpg
---
Logical Volume Management (LVM) konusunu anlatmaya başlamadan önce kısaca bu yazının ortaya çıkma sebebinden ve içeriğinden bahsetmek istiyorum. İnternette LVM hakkında bir çok yazı bulunsa da, konuyu araştırmaya başladığım sürede okuduğum bazı yazıların ortak özelliği yeterince açıklayıcı veya kapsamlı olmamasıydı. Bu yüzden öğrendiklerimi, bu konunun temeli olan fiziksel disklerden en üst katmanına kadar bir bütün şeklinde açıklayarak bu yazıda toplamak istedim. İlk olarak LVM’siz bir sistemde oluşan bir duruma göz atacağız. Sonrasında ise LVM ne olduğunu ve yapısını açıklayarak bu durumu nasıl çözdüğünü ve diğer avantajlarını anlatacağım.

*fotoğraf

## Log Dosyalarının Diski Doldurması

Öncelikle LVM’siz bir sistemde depolama alanı dolduğunda oluşan duruma bakalım. Sistemin lsblk komutu ile görüntüsü şu şekilde:
foto2
Aşağıdaki ekte sisteme yeni eklenmiş 20 GB’lık bir depolama birimi (/dev/sdb) bulunuyor . Bu depolama birimi /dev/sdb1 ve /dev/sdb2 olarak 10 GB’lık bölümlere ayrılmış. /data1 ve /data2’ye mount edilen bu iki bölüm uygulamaların log dosyalarını kaydetmek için oluşturulmuş.
foto3
Gerçek hayatta karşılaşılan sorunlardan birisi olan, log dosyalarının diskteki alanını tüketmesini simule edelim. Bu komut diski hızlıca dolduracağından kendi sistemlerinizde denemeyin. 
foto4
cat /dev/zero > /data1/application.log ve cat /dev/zero > /data2/application.log
Aşağıdaki diagramda LVM’siz bir sistemi ve watch df -h komutu ile yaptığımız işlemi daha net görebilirsiz. Log dosyalarının diskteki alanı tüketmesini simule ediyoruz ve disk bu komuttan sonra dolmaya başlıyor.

## LVM nedir ?
Resmi Red Hat Documentation sitesinde yazıldığı şekilde, LVM fiziksel depolama üzerinde bir soyutlama katmanı oluşturarak mantıksal depolama birimleri (logical volume) oluşturmanızı sağlar. Bu, fiziksel depolamayı doğrudan kullanmaya kıyasla birçok açıdan çok daha fazla esneklik sunar. Bir logical volume ile, fiziksel disk boyutlarıyla sınırlı kalmazsınız. Ayrıca, donanım depolama yapılandırması yazılımdan gizlenir, böylece uygulamalar durdurulmadan veya dosya sistemleri unmount edilmeden yeniden boyutlandırılabilir ve taşınabilir. Bu da operasyonel maliyetleri azaltabilir. LVM ayrıca anlık görüntü alma (snapshot), şeritleme (striping) ve yansılama (mirroring) gibi gelişmiş özellikler de sunar.

