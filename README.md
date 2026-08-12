# Mevlut Bulut — Jekyll Blog

## Kurulum
```bash
bundle install
bundle exec jekyll serve
```
Site `http://localhost:4000` adresinde açılır.

## Görselleri ekleme
Aşağıdaki dosyaları `assets/images/` klasörüne kendi görsellerinle koy (isimler `_config.yml` ve post front matter'larında bu şekilde referans veriliyor):

- `assets/images/cover-default.jpg`  → ana sayfa hero görseli
- `assets/images/cover-about.jpg`    → about sayfası hero görseli
- `assets/images/cover-lvm.jpg`      → LVM yazısı hero görseli
- `assets/images/cover-nginx.jpg`    → Nginx yazısı hero görseli

Yeni bir yazı eklerken front matter'a `cover: /assets/images/senin-gorselin.jpg` satırını ekle; eklemezsen otomatik olarak `cover-default.jpg` kullanılır.

## Yeni yazı ekleme
`_posts/` klasörüne `YYYY-MM-DD-baslik.md` formatında dosya ekle:

```markdown
---
title: "Yazı Başlığı"
tags: [etiket]
cover: /assets/images/cover-ornek.jpg
---

Yazı içeriği buraya.
```

## Tag sayfaları
`jekyll-archives` eklentisi sayesinde her etiket için otomatik olarak
`/tag/etiket-adi/` sayfası üretilir, elle bir şey oluşturmana gerek yok.

## Production build (nginx'e vermeden önce)
```bash
JEKYLL_ENV=production bundle exec jekyll build
```
Oluşan `_site/` klasörünün içeriğini sunucuda nginx'in `root` gösterdiği
klasöre kopyalaman yeterli.
