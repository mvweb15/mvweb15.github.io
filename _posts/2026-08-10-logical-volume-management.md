---
title: "Logical Volume Management"
tags: [lvm]
cover: /assets/images/cover-lvm.jpg
---
Before I begin explaining Logical Volume Management (LVM), I'd like to briefly talk about why this article came about and what it covers. Although there are many articles about LVM on the internet, a common shortcoming I noticed in many of the articles I read while researching this topic was that they weren't sufficiently explanatory or comprehensive. That's why I wanted to gather what I've learned into this article, explaining it as a complete whole, starting from physical disks, which form the foundation of this subject, all the way up to its topmost layer. First, we'll take a look at a situation that arises in a system without LVM. Afterward, I'll explain what LVM is and describe its structure, showing how it solves this situation. Then, I'll go over the other advantages of LVM.


## Log Files Filling Up the Disk

First, let's look at what happens in a system without LVM when the storage space fills up. The output of the system's `lsblk` command looks like this:
![lsblk komutu çıktısı](/assets/images/lvm/lsblk_cikti.png)

In the attachment below, there's a newly added 20 GB storage device, /dev/sdb, in the system. This storage device has been partitioned into 10 GB sections as /dev/sdb1 and /dev/sdb2. These two partitions, mounted at /data1 and /data2, were created to store the applications' log files.
![lsblk komuut çıktısı2](/assets/images/lvm/2_lsblk.png)

Let's simulate one of the problems encountered in real life: log files consuming the disk's space. Since this command will fill up the disk quickly, don't try it on your own systems.

`cat /dev/zero > /data1/application.log`
`cat /dev/zero > /data2/application.log`

In the diagram below, you can more clearly see a system without LVM and the operation we performed using the `watch df -h` command. We're simulating log files consuming the disk's space, and the disk starts filling up after this command.
{% include video-loop.html src="/assets/videos/lvm/video01.mp4" class="video-loop--medium" %}
In this situation, you could of course choose to move the log files to another disk or delete them. But as you can probably guess, this process gets harder as the number of disks increases. In this case, you could expand your file system using LVM, or solve this problem in other ways. However, since the system you see above doesn't use LVM, you can't expand your file system. Now I'll explain LVM, which solves this problem and provides many other advantages, and describe how we'll use it.


## What is LVM ?
As stated on the official Red Hat documentation site[^1], LVM allows you to create logical volumes by forming an abstraction layer over physical storage. This offers far more flexibility in many respects compared to using physical storage directly. With a logical volume, you're not limited by physical disk sizes. Additionally, the hardware storage configuration is hidden from the software, so volumes can be resized and moved without stopping applications or unmounting file systems. This can, in turn, reduce operational costs.

## Components of LVM
As stated in the technical definition, LVM creates an abstraction layer over physical storage. As you can see below, this layer consists of 3 components.
<img src="/assets/images/lvm/lvmdiagramupdate1.png" alt="lvmbilesen" class="post-img" style="max-width: 350px;">
## Physical Volume
It forms the lowest layer of the LVM structure. It's created when a physical storage unit, such as a disk, disk partition, or RAID array, is made usable by LVM. In order for a physical disk to be managed by LVM, it must first be converted into a Physical Volume.
## Volume Group
LVM gathers these storage units, which have been created as Physical Volumes, into a storage pool called a Volume Group. Physical Volumes can't be used on their own; they're first added to a Volume Group, and in this way, the capacities of disks with different sizes are combined into a single logical pool. This Volume Group represents the shared storage space that the Logical Volumes will use.
## Logical Volume
It's the highest layer of the LVM structure. It's a section carved out of the Volume Group at a specific size, according to need. Logical Volumes behave similarly to classic disk partitions, and a file system can be set up on them, formatted, and mounted. Unlike a physical disk, the size of Logical Volumes can easily grow or shrink based on the capacity of their Volume Group. As can be understood from the situation I described earlier, this is one of LVM's biggest advantages.

Now that I've covered these definitions, I'll continue by explaining the remaining details through an LVM configuration scenario, without burying you in more technical information. For your convenience and mine as we move through the rest of the article, I recommend familiarizing yourself with these terms:

PV: Physical Volume

VG: Volume Group

LV: Logical Volume

## LVM Configuration Scenario
Now that I've explained LVM and its structure, I'll walk through an LVM configuration using a scenario to better illustrate the topic. Our scenario is as follows:

There are 2 newly added disks in the system, 50 GB and 100 GB in size. As a solution to the "log files filling up the disk" problem I mentioned earlier, we decide to manage these disks with LVM. We'll first convert these disks into PVs, and then bring them into LVM. Next, we'll combine these PVs into a common pool called a VG. From this pool, we'll create two LVs, `lv_data1` at 25GB and `lv_data2` at 50GB, and after setting up a file system on each, we'll mount them at `/data1` and `/data2`. 

After completing the setup, we'll simulate the "log files filling up the disk" scenario again on `/data1`. As a solution, we'll directly grow the size of our LV by using the free space in the VG that the LV belongs to.

After that, we'll fill up the free space on `/data2` as well. When we want to expand this LV's size to 150G, we'll see that there's no free space left in the VG.

To solve this problem, we'll add a 3rd disk to the VG to expand the pool, and then grow `/data2`. Next, assuming that the disk `lv_data1` resides on has started to fail, we'll migrate `lv_data1` to another disk. After completing these steps, I'll go on to show LVM's other features.

## LVM Configuration with Explanations
First, let's view the new disks using the `lsblk` command.
![diskler](/assets/images/lvm/diskler.png)
Before converting the physical disks into PVs, I need to mention something. It's possible to add physical disks directly to LVM without partitioning them. Alternatively, it's also possible to partition the physical disks first and create PVs from these partitions to add to LVM. However, according to the Red Hat documentation site, it's generally recommended to create a single disk partition that spans the entire disk, mark this partition as Linux LVM, and then convert it into a PV [^2]. For this reason, instead of using the disks directly, I'll stick to Red Hat's recommendations. Now that I've explained this detail, we can continue.

## Disk Partitioning
You can see the process we'll perform below. At the beginning of each section, I'll include these diagrams to make it easier to follow and explain.
<img src="/assets/images/lvm/diskpartition1.png" alt="fdisk" class="post-img post-img--left" style="max-width: 650px;">
First, we'll use the `fdisk` command to partition the newly added disks into a single partition each, and mark them as Linux LVM.
Run the `fdisk /dev/sdb` command, then type `n` to begin creating a new partition.
<img src="/assets/images/lvm/fdisk.png" alt="fdisk" class="post-img post-img--left" style="max-width: 650px;">
Now type `p` to select the primary partition option. For the `Partition number`, enter 1. Since we'll be using the entire disk for this partition, you can leave the `First sector` and `Last Sector` options blank and press enter to skip them.
<img src="/assets/images/lvm/part.png" alt="part" class="post-img post-img--left" style="max-width: 650px;">
Type `t` to mark the disk as `Linux LVM`. Type L to see the options.
<img src="/assets/images/lvm/toption.png" alt="toption" class="post-img post-img--left" style="max-width: 650px;">
Mark the partition as Linux LVM using the hex code 8E.
<img src="/assets/images/lvm/83.png" alt="83" class="post-img post-img--left" style="max-width: 650px;">
Check the changes you've made by typing `p`, then type `w` to save and exit.
<img src="/assets/images/lvm/poption.png" alt="poption" class="post-img post-img--left" style="max-width: 650px;">
Repeat this same process for `/dev/sdc`. The disks should look like this:
<img src="/assets/images/lvm/diskler2.png" alt="diskler2" class="post-img post-img--left" style="max-width: 650px;">

## Converting Physical Disk Partitions into Physical Volumes
<img src="/assets/images/lvm/pvcreatefrom1.png" alt="pvcreate1" class="post-img post-img--left" style="max-width: 650px;">
We use the `pvcreate` command to create a Physical Volume (PV). To convert the partition into a PV for use in LVM, run the `pvcreate /dev/sdb1` command.
<img src="/assets/images/lvm/pvcreate1.png" alt="pvcreate1" class="post-img post-img--left" style="max-width: 650px;">
Use the `pvdisplay` command to view the details of the PV we created.
<img src="/assets/images/lvm/pvnew1.png" alt="pvdisplay" class="post-img post-img--left" style="max-width: 650px;">
1: The PV's name is `/dev/sdb1`, the name of the physical disk we created it from.

2: `VG Name` is empty because we haven't added this Physical Volume to a Volume Group yet.

3: `PV Size` 50 GiB indicates the size of the Physical Volume. Don't confuse GiB here with GB. You can find the difference between them in the sources[^3] section.

4: `Allocatable NO` because the Physical Volume hasn't been added to a Volume Group yet.

5 - 6 - 7 - 8: Let me explain what PE means in this part. PE (Physical Extent) is the smallest storage unit on a Physical Volume (PV). When a Physical Volume is added to a Volume Group, the disk is managed not in bytes but by being divided into fixed-size blocks called extents. The size of these blocks is 4 MiB. So since this Physical Volume of ours hasn't been added to a Volume Group yet, it hasn't been divided into extents yet, which is why the PE-related fields currently show 0.

9: This is the Physical Volume's unique identifier. This UUID is written into the LVM metadata area (header) at the very beginning of a disk like `/dev/sdb1`. In other words, the UUID isn't tracked on the operating system's side, but is physically carried on the disk itself. Even if the disk's name or order changes, or it's moved to another server, the PV UUID remains the same. The LVM structure, meaning the relationship between the Physical Volume (PV), Volume Group (VG), and Logical Volume (LV), is built through cross-referencing (PV↔VG↔LV) via these UUIDs.

Now let's continue by converting the `/dev/sdc1` disk into a Physical Volume.

`pvcreate /dev/sdc1`
<img src="/assets/images/lvm/devsdc.png" alt="devsdc" class="post-img post-img--left" style="max-width: 650px;">
Use the `pvs` command to view a summary of the PVs we've created.
<img src="/assets/images/lvm/pvs.png" alt="devsdc" class="post-img post-img--left" style="max-width: 650px;">
Our disks are now ready to be used by LVM and to create a VG.
## Creating a Volume Group from Physical Volumes
{% include video-loop.html src="/assets/videos/lvm/vgcreate2.mp4" class="video-loop--medium" %}
Now we'll use one of the PVs we created along with the `vgcreate` command to create a VG. After that, we'll add the other PVs to this pool.

Syntax: `vgcreate <vg_name> <pv_path>`

Command: `vgcreate vg_base /dev/sdb1`
<img src="/assets/images/lvm/vgcreate.png" alt="vgcreate" class="post-img post-img--left" style="max-width: 650px;">
Before we start examining the VG, let's take another look at the details of the `/dev/sdb1` PV we just created.
<img src="/assets/images/lvm/pvnew2.png" alt="display" class="post-img post-img--left" style="max-width: 650px;">
1: The PV is now allocatable since it's part of a VG.

2: As I explained earlier, once the PV is added to the VG, it gets divided into 4 MiB blocks.

3: This shows that the PV consists of a total of 12799 4 MiB blocks, and indicates the free space.

4: No space has been allocated from this disk yet.
We can better see the difference by comparing our two PVs.
<img src="/assets/images/lvm/updatedvgoutput.png" alt="fark" class="post-img post-img--left" style="max-width: 650px;">
As you can see, after being added to the VG, the PV `/dev/sdb1` has been divided into 12799 blocks of 4.00 MiB in size. The PV `/dev/sdc1`, on the other hand, hasn't been divided into blocks yet since it hasn't been added to a VG. Now let's examine the VG we created using the `vgdisplay` command.
<img src="/assets/images/lvm/vgdisplaynew.png" alt="vg" class="post-img post-img--left" style="max-width: 650px;">
1: The VG's name.

2: The system ID the group belongs to. Typically used in cluster environments, so it's empty.

3: The standard LVM format version.

4: A VG's configuration information is referred to as metadata. This metadata holds general configuration information such as which LV in the LVM has what size, which PEs are stored where, UUIDs, and names. By default, this metadata is kept by being copied into the metadata[^4] areas of all PVs within the VG. I don't want to go into more detail on this topic than we need. You can check the sources section for further details.

5: A revision number that increases by 1 every time an operation is performed on the VG.

6: By default, you can create, delete, and resize LVs. When set to "read-only," you can't perform any operations such as creating, deleting, or extending LVs.

7: A fixed value marked as resizable. It rarely changes except in very rare cases, so I won't go into detail about it.

8: The number of LVs that can be created within the VG. A value of 0 means unlimited.

9: The number of LVs within the VG. It's 0 because we haven't created any LVs yet.

10: The number of LVs currently in use is 0.

11: The number of PVs that can be added to the VG. A value of 0 means unlimited.

12: The number of PVs in the VG.

13: The number of active PVs in the VG.

14: The VG's size in GiB. This value will increase shortly once we add our other PV, /dev/sdc1.

15: The PE (Physical Extent) size. 4 MiB by default.

16: Indicates that the VG consists of 12799 blocks of 4 MiB.

17: The number of allocated blocks and gibibytes. It's 0 since we haven't created an LV yet.

18: The number of allocatable blocks.

19: The unique identifier number. As I explained earlier, when we add a PV to a VG, LVM writes the VG's UUID onto that PV. This way, it knows which VG it belongs to by its UUID, not by the PV's name.

As you can see here in the output of the `pvs -o pv_name,pv_uuid,vg_name,vg_uuid` command `/dev/sdb1` points to the `vg_base` group via its UUID.
<img src="/assets/images/lvm/uuid.png" alt="point" class="post-img post-img--left" style="max-width: 750px;">
Now let's add the `/dev/sdc1` PV to the VG we created, using the `vgextend` command.

Syntax: `vgextend <vg_name> <pv_name>`

Command: `vgextend vg_base /dev/sdc1`
<img src="/assets/images/lvm/vgextend.png" alt="vgextend" class="post-img post-img--left" style="max-width: 650px;">
Using the `vgdisplay` command again, we can see that the VG's size has increased. The `Cur PV` and `Act PV` counts have gone up to two.
<img src="/assets/images/lvm/curpvnew.png" alt="volume" class="post-img post-img--left" style="max-width: 650px;">
Now our PVs are in the same pool. The PV UUIDs point to the VG UUID of our VG named `vg_base`.
<img src="/assets/images/lvm/vguuid.png" alt="havuz" class="post-img post-img--left" style="max-width: 650px;">
## Creating Logical Volumes From Volume Group
<img src="/assets/images/lvm/lvcreatediagram.png" alt="havuz" class="post-img post-img--left" style="max-width: 650px;">
Now, we'll use the `lvcreate` command to create a Logical Volume (LV) from our VG named `vg_base`, on which we can create a file system.

Syntax: `lvcreate -L <size> [M|G|T] -n <lv_name> <vg_name>`

Command: `lvcreate -L 25G -n lv_data1 vg_base`

With this command, we specify the amount we want in bytes using `-L`, or as a percentage or in blocks using `-l`. Although it's usually not specified in blocks, it's still useful to know. After specifying the name of the LV we want to create with `-n`, we indicate which VG this volume will be created from.
You can examine the LV we created using the `lvdisplay` command.
<img src="/assets/images/lvm/lvdisplaynew.png" alt="lvdisplay" class="post-img post-img--left" style="max-width: 650px;">
1: The device path for the LV. After adding a file system, we'll mount the LV using this path.

2: The LV's name.

3: The name of the VG this LV belongs to.

4: The unique identifier number for each LV on the system.

5: Read/write is enabled on the LV. You can set your LV to read-only.

6: Information about which host the LV was created on and when.

7: The LV is active and ready for use.

8: The LV is active but not currently mounted; no one is using it.

9: The LV's total size.

10: The number of Logical Extents (Logical Blocks) that make up the LV. It consists of a total of 6400 4 MiB blocks.


11: Shows how many segments the LV consists of. On disk, it's a single, unsplit segment. I'll explain this part later.

12: Allocation rules, taken from the VG, meaning there's no special setting. This is generally the case.

13: The read-ahead setting is set to automatic.

14: The actual current "read-ahead" value under the automatic setting, 256 sectors. Not an important detail.

15: Shows the major:minor number within the kernel. An identifier assigned at runtime at the kernel level. Again, not an important detail in our case.

Now let's create the 50GiB `lv_data2` LV.
`lvcreate -L 50G -n lv_data2 vg_base`
<img src="/assets/images/lvm/lvdata2.png" alt="lvdata2" class="post-img post-img--left" style="max-width: 650px;">
Let's examine the current state of our VG using the `vgdisplay` command.
<img src="/assets/images/lvm/vgdnew.png" alt="vgdisplay2" class="post-img post-img--left" style="max-width: 650px;">
1: The number of LVs in the VG.

2: Shows how many of the LVs are open/in use. It's 0 for now, since we haven't added a file system to the LVs we created and mounted them yet.

3: The total size of our VG. We had added 2 PVs, 50 and 100GiB.

4: 75GiB of this 150GiB pool is being used. We created 2 LVs, 25 and 50GiB.

5: The remaining free space in the VG.

We can see the distribution using the `lsblk` command.
<img src="/assets/images/lvm/lsblk.png" alt="lsblk" class="post-img post-img--left" style="max-width: 650px;">
As you might notice here, by default, LVM doesn't select a PV randomly or sequentially when creating an LV. Instead, it selects the PV that's the best fit for the size of the LV to be created. For example:

The 25GiB LV > was created from the 50 GiB PV.
The 50GiB LV > was created from the 100 GiB PV.

In other words, rather than first filling up one PV completely and then splitting the overflow onto another PV (the segment topic I'll explain later), LVM selects, among the PVs in the VG, the most suitable one that can hold the LV as a single piece. LVM uses the normal allocation policy by default when allocating physical extents for an LV. According to Red Hat's official documentation [^5], it's recommended that you not change this setting.

If we had created a 125 GiB LV, since there's no PV of that size, the LV would normally have been split into segments, as you can see below.
<img src="/assets/images/lvm/test.png" alt="test" class="post-img post-img--left" style="max-width: 650px;">
Let's take a look at this LV that I created as an example, using the `lvdisplay` command.
<img src="/assets/images/lvm/segmentsnew.png" alt="segment" class="post-img post-img--left" style="max-width: 650px;">
1: I mentioned I'd explain this part later. The segments field shows which PVs and which areas on disk the LV resides in. As you can see, since none of the PVs in our VG are 125GiB in size, our LV has been split into 2 pieces. An LV doesn't always have to be physically contiguous. It can be fragmented like this. We call each contiguous piece a segment. If the segment count is 1, it means the LV resides as a single piece, in a contiguous area. This is the preferred, clean layout.

If the segment count is more than one, it means the LV is spread across different PVs. In cases like this, where the PV sizes aren't sufficient, LVs can naturally be split into segments. However, as I'll show in another example in the next part, this kind of unwanted fragmented layout isn't preferred in environments using HDDs, since it causes the disk head to move around more.
## Creating and Mounting a File System
<img src="/assets/images/lvm/filesystem1.png" alt="segment" class="post-img post-img--left" style="max-width: 650px;"> 
At the end of the LVM process, we can start using our LVs by adding a file system with the mkfs command and mounting them onto the system.
Syntax: `mkfs.<filesystem_type> <device_path>`

A quick reminder before creating the file systems, the ext4 file system is ideal for desktop use or small-sized systems. Its size can be shrunk.

The xfs file system's size can't be shrunk. In other words, you can grow the size of an LV, but if you want to shrink it, you'll need to delete the LV and recreate it from scratch. So you should be careful about this.

Now let's create the file systems.

Command 1: `mkfs.ext4 /dev/vg_base/lv_data1`

Command 2: `mkfs.xfs /dev/vg_base/lv_data2`

After creating the file systems on our LVs, let's verify with the blkid command.

Command 1: `blkid /dev/vg_base/lv_data1`

Command 2: `blkid /dev/vg_base/lv_data2`
<img src="/assets/images/lvm/blkid10.png" alt="blkid" class="post-img post-img--left" style="max-width: 650px;">
Let's create the mount points.

Command 1: `mkdir /data1`

Command 2: `mkdir /data2`

Let's mount our LVs to these mount points.

Command 1: `mount /dev/vg_base/lv_data1 /data1`

Command 2: `mount /dev/vg_base/lv_data2 /data2`

Let's use the `lsblk` command to check.
<img src="/assets/images/lvm/lsblk2.png" alt="lsblk2" class="post-img post-img--left" style="max-width: 650px;">
Now the LVs are ready to be used. To make the mount points persistent, we'll add the LV UUIDs to the `/etc/fstab` file. Let's use the `blkid` command to find out the UUIDs of our LVs.
<img src="/assets/images/lvm/blkid12.png" alt="blkid2" class="post-img post-img--left" style="max-width: 750px;">
Copy the UUIDs and add them to the bottom of the `/etc/fstab` file, as shown below.
<img src="/assets/images/lvm/vimetc.png" alt="etc" class="post-img post-img--left" style="max-width: 800px;">
Now, every time the system boots, our LVs will automatically be mounted to these folders. Now that we've completed the LVM process, you can see all the steps we performed below.
{% include video-loop.html src="/assets/videos/lvm/fulldiagram2.mp4" class="video-loop--medium" %}

## Disk Filling Up Scenario: /data1
Now we'll simulate the "log files filling the disk" scenario again on `/data1`. The command we'll use for this test:
`cat /dev/zero > /data1/application_1.log`

You can see the LV filling up.
{% include video-loop.html src="/assets/videos/lvm/disk_dolumu2.mp4" class="video-loop--medium" %}

Now that we're using LVM in our system, we can solve this problem by expanding the size of our storage space. The command used to expand LV size is `lvextend`

Syntax 1: `lvextend -l +100%FREE <lv_path>` uses all the free space in the VG.

Syntax 2: `lvextend -L 50G <lv_path>` expands the LV to a specific size.

Syntax 3: `lvextend -L +50G <lv_path>` adds a specific amount to the LV.

Now let's expand the size of our LV.
Command: `lvextend -L +24G /dev/vg_base/lv_data1`
<img src="/assets/images/lvm/extend.png" alt="exnted" class="post-img post-img--left" style="max-width: 650px;">
The reason I used 24G instead of 25G is that `lv_data1`, which we're currently expanding, resides on the 50GiB PV`/dev/sdb1`. At first glance, you might think of using up the entire 50GiB PV by adding 25GiB more to the LV. However, in reality, the allocatable size of `/dev/sdb1` for LVM isn't exactly 50GiB, but approximately 49.5GiB. In other words, if I had expanded it by 25GiB instead of 24, we would have seen the remaining 500 MiB split off onto another disk (segment). As you can see below, this causes unnecessary complexity and makes management harder.
<img src="/assets/images/lvm/disktest.png" alt="disktest" class="post-img post-img--left" style="max-width: 650px;">
So, if you don't want your LV to be split onto other disks beyond the PV it currently resides on when expanding it, pay attention to this situation.

Let's check the size of our LVs using the `df -h /data1 /data2` command.
<img src="/assets/images/lvm/dfh.png" alt="disktest" class="post-img post-img--left" style="max-width: 650px;">
As you may have noticed, even though we added 25 GB more to the LV, its size didn't increase, and it still shows as 25GiB instead of 50GiB.

The reason for this is that the `lvextend` command only grows the LV itself; it doesn't change the size of the file system on top of it. That's why, after using the lvextend command, you also need to expand the file system. The commands used for this operation are:

To expand the XFS file system: `xfs_growfs`
To expand the EXT4 file system: `resize2fs`

Let's expand the file system of our LV.

`resize2fs /dev/vg_base/lv_data1`
<img src="/assets/images/lvm/resize.png" alt="resize" class="post-img post-img--left" style="max-width: 650px;">
Let's check the size again using the `df -h /data1 /data2` command.
<img src="/assets/images/lvm/dfh10.png" alt="resize" class="post-img post-img--left" style="max-width: 650px;">
As you can see, after expanding the file system, our LV's size increased to 50GiB.

## Disk Filling Up Scenario: /data2
In this part, just like we did with `/data1`, we'll fill up the free space on `/data2` as well. This time, we want to solve the disk-filling problem by growing the size of the `lv_data2` LV to 150GiB. However, there isn't enough space left in our VG. That's why we've added a new disk to the system, and we'll expand the size of the VG. We'll set our LV's size to 150GiB, and finally complete the process by expanding the file system as well.

We'll use the commands you already know from previous sections and follow the same steps. The purpose of this example is to show the process of growing our LV's size when there's no free space left in the VG.

Now let's fill up the free space using the `cat /dev/zero > /data2/application_2.log` command.
<img src="/assets/images/lvm/data2.png" alt="data2" class="post-img post-img--left" style="max-width: 650px;">
We want to expand the size of `lv_data2`, which /data2 is mounted on, to 150GiB, but as you can see here, there's only 50GiB of space left in the VG.
<img src="/assets/images/lvm/bospace.png" alt="bospace" class="post-img post-img--left" style="max-width: 650px;">
To solve this problem, we've added a 150GiB `/dev/sdd` disk to our system, and we're verifying it using the `lsblk` command.
<img src="/assets/images/lvm/sdd3.png" alt="sdd3" class="post-img post-img--left" style="max-width: 650px;">
Before converting our disk into a PV to use in the VG with the `pvcreate command`, as you'll recall, we first create a partition that spans the entire disk. This is the same process I explained in the earlier sections. So I won't show the disk partitioning step again. If you'd like, you can review the steps again by clicking on "Disk Partitioning" in the "Contents" panel.

As you can see below, we've created a partition that spans the entire disk.
<img src="/assets/images/lvm/butundisk.png" alt="sdd3" class="post-img post-img--left" style="max-width: 650px;">
Now let's convert this partition into a PV.

`pvcreate /dev/sdd1`
<img src="/assets/images/lvm/devsdd.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
We're growing our VG's size by adding the PV we created, using the `vgextend` command. As a reminder:

Syntax: `vgextend <vg_name> <pv_path>`

Command: `vgextend vg_base /dev/sdd1`
<img src="/assets/images/lvm/vgextenddd.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
Let's take a look at our VG's new size using the `vgdisplay` command.
<img src="/assets/images/lvm/yenispace.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
After adding our new PV, the total space has increased from 150 GiB to 299.99 GiB. We can now use this space to grow the size of our `lv_data2` LV.

Command: `lvextend -L 150G /dev/vg_base/lv_data2`
<img src="/assets/images/lvm/logical.png" alt="devsdd" class="post-img post-img--left" style="max-width: 825px;">
I mentioned that after growing our LV's size using the `lvextend` command, we need to expand the file system. We shouldn't use the `resize2fs` command we used in the previous stage, because `lv_data2` uses the XFS file system. You can find out the file system type using blkid.
<img src="/assets/images/lvm/blkidata2.png" alt="devsdd" class="post-img post-img--left" style="max-width: 825px;">
That's why the command we will use is: `xfs_growfs`

`xfs_growfs /dev/vg_base/lv_data2`
<img src="/assets/images/lvm/grownew1.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
We've expanded the XFS file system. You can see that the size of `/data2` has increased.
<img src="/assets/images/lvm/xfsgroww.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;"> 
Our current state looks like this with the `lsblk` command. Since a single PV couldn't accommodate the `lv_data2` LV that we expanded to 150 GiB, this LV is now spread (segmented) across the `/dev/sdc1` and `/dev/sdd1` PVs.
<img src="/assets/images/lvm/sonlsblk.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
It's not possible to tell from the standard `lsblk` or `vgs` output how much space `lv_data2` takes from which PV. You can use this command to find this out:
Command: `pvs -o lv_name,lv_size,pv_name,pv_size,seg_size --units g -S "lv_name=lv_data2"`
<img src="/assets/images/lvm/longcommandnew.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
Although the command we used isn't very practical, its output is quite easy to understand.

1: The LV's name and size.

2: The PVs this LV resides on, and their sizes.

3: The total space this LV takes from these PVs.

In other words, the 150GiB LV `lv_data2` uses `100GiB` of space from the 100 GiB `/dev/sdc1`, and 50GiB of space from the 150 GiB `/dev/sdd1`.

## Shrinking a Logical Volume's Size
We decide that we no longer need 49GiB of space on the `lv_data1` LV. So we'll shrink our LV's size to free up room in our VG for other LVs. Before we begin, there are two important details you need to know. In LVM, shrinking an LV's size is riskier than growing it, because there's a risk of data loss. The file system must be shrunk first, and then the LV. If you do this in the reverse order, you'll lose your data. The other detail is that the XFS file system doesn't support shrinking in any way. XFS can only be grown. If you're using XFS, the only way to shrink an LV is to create a new LV at the size you want and migrate your data there. That's why we'll shrink `lv_data1`, which uses the EXT4 file system.

First, let's start by unmounting `lv_data1`.

Command: `umount /dev/vg_base/lv_data1`

Let's check our file system for errors.

Command: `e2fsck -f /dev/vg_base/lv_data1`

<img src="/assets/images/lvm/dosyasistemikontrol.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">

Let's shrink our file system.

Command: `resize2fs/dev/vg/base_lv_data1 25G`
<img src="/assets/images/lvm/resize2fs.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
Now we can shrink our LV.

Syntax: `lvreduce -L <target_size <lv_path>`
Command: `lvreduce -L 25G /dev/vg_base/lv_data1`

<img src="/assets/images/lvm/lvreduce.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
Let's mount it again and check.

Command 1: `mount /dev/vg_base/lv_data1 /data1`

Command 2: `df -h | grep data`

<img src="/assets/images/lvm/remoun.png" alt="devsdd" class="post-img post-img--left" style="max-width: 650px;">
As you can see, it's a short and simple process. But be careful not to mix up the order, or you could lose your data.
## Disk Failure Scenario
Now let's assume that the `/dev/sdb` disk, which houses the LV `lv_data1` which is mounted at `/data1`, has started to fail. In this case, the first solution that comes to mind might be to switch `/data1` to read-only mode, as often recommended, and start the migration with the `mv` command. However, as you know, this approach causes downtime. Moreover, commands that operate at the file system level, like `mv`, will leave the operation half-finished if something like a power outage or a disk error occurs during the move, and you'll have to manually check which files were moved and which weren't. There's no automatic resume or rollback mechanism. On top of that, if there's more than one LV on the disk, moving files with the `mv` command doesn't remove the disk from the VG, so the other LVs on that disk would still remain on the failing disk.

For this reason, before removing our failing disk from the VG, we'll use the `pvmove` command to safely migrate the LV and its data. Unlike `mv`, the `pvmove` command operates at the block level. In other words, it doesn't care at all about what the file system is or what files are inside it. It moves LVM's PEs from one PV to another. What actually happens isn't a "file move," but a change in where the LV physically resides. `pvmove` performs the move in segments by creating a temporary mirror (like RAID) between the source and the destination. As each segment completes, the progress is written to the VG metadata as a checkpoint. This operation runs in the background while the LV is mounted and services are running. So you don't need to unmount the disk or experience any downtime to move the data. If the system crashes or the disk throws an error during the process, LVM records it as an incomplete `pvmove`, and when you run the command again, it picks up where it left off, because LVM knows which PEs have been moved and which haven't. This way, everything is preserved. Now that I've explained these details, we can begin.

We've noticed that the `/dev/sdb` disk has started to fail. We had created the PV named `/dev/sdb1` on this disk. That means all the LVs and data on the `/dev/sdb1` PV are at risk. So we want to safely migrate these LVs to the `/dev/sdd1` PV, which we created from our newly added `/dev/sdd` disk. First, let's check whether there's enough space on `/dev/sdd1` using the `pvs` command.

<img src="/assets/images/lvm/pvs2.png" alt="3disk" class="post-img post-img--left" style="max-width: 650px;">
As you can see, the `/dev/sdd1` PV has enough space. Before we begin, let's see which LVs are using which PVs, so we can refer back to it later, using the command `pvs --segments -o lv_name,seg_size,pv_name,pv_size --units g | awk 'NF==4'`
<img src="/assets/images/lvm/pvsoption.png" alt="pvsoption" class="post-img post-img--left" style="max-width: 450px;">
As a best practice, let's back up our VG's LVM configuration information using the `vgcfgbackup vg_base` command.
<img src="/assets/images/lvm/vgbackup.png" alt="vgbackup" class="post-img post-img--left" style="max-width:550px;">
Now let's begin the process using the `pvmove` command.

Syntax: `pvmove <source_pv> <destination_pv>`

Command: `pvmove /dev/sdb1 /dev/sdd1`
<img src="/assets/images/lvm/pvmoved.png" alt="pvmoved" class="post-img post-img--left" style="max-width: 650px;">
After the migration completes, let's take another look at the current state using the `pvs --segments -o pv_name,pv_size,lv_name,seg_size --units -g` command again.
<img src="/assets/images/lvm/pvsfinal.png" alt="pvmoved" class="post-img post-img--left" style="max-width: 450px;">
As you can see, the `lv_data1` LV has now been moved to the `/dev/sdd1` PV. After the migration is complete, we can remove the `/dev/sdb1` PV, created from the failing disk, from the VG. The command we'll use is `vgreduce`.
Syntax: `vgreduce <vg_name> <pv_name>`
Command: `vgreduce vg_base /dev/sdb1`
<img src="/assets/images/lvm/vgreduce.png" alt="pvmoved" class="post-img post-img--left" style="max-width: 550px;">
Now that we've removed our PV from the VG, we can remove our disk from PV status.
<img src="/assets/images/lvm/pvremove2.png" alt="pvremve" class="post-img post-img--left" style="max-width: 650px;">
We've now completed our operation, and without unmounting the disk or switching it to read-only mode, we migrated all the LVs on the disk and their data live, without any downtime. If we had had more than one LV, the same steps would still apply.
## LVM Striping
Before I get into the topic of LVM striping, I should mention creating RAID using LVM. After converting your physical disks into PVs, you can use LVM's RAID feature to create RAID at levels 0, 1, 4, 5, 6, and 10 from your PVs[^6]. However, common practice recommends creating the RAID first, and then adding this RAID device to LVM as a PV. In other words, rather than managing disk-failure handling and redundancy tracking with LVM, it's a more correct approach to create the RAID using the mdadm command, which is designed specifically for this purpose. This way, RAID management is handled by mdadm, while volume management is handled by LVM.

For this reason, instead of covering LVM's RAID features comprehensively in this section, we'll focus on the RAID 0 (striping) method, which doesn't provide redundancy but is the most commonly preferred use case within LVM. It's used to increase disk performance.

We've added 2 disks to our system: `/dev/sde` at 50GiB and `/dev/sdf` at 50GiB. We'll convert these disks into PVs, add them to LVM, and create an LV with a RAID 0 (striping) configuration.

First, let's take a look at our disks.
<img src="/assets/images/lvm/yenidiskler.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 650px;">
Let's partition our disks in order to create PVs. You can review this process in the "Contents" section under "Disk Partitioning." The output of the `lsblk /dev/sde /dev/sdf` command should look like this:
<img src="/assets/images/lvm/lsblknew.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 650px;">
We're creating our PVs using the `pvcreate /dev/sde1 /dev/sdf1` command.
<img src="/assets/images/lvm/pvler1.png" alt="yenidiskler" class="post-img post-img--left" style="max-width 450px;">
To make things easier to track, we'll create a new VG named `vg_stripe`, separate from the `vg_base` VG that we created in the earlier stages. As a reminder:

Syntax: `vgcreate <vg_name> <pv_path>`

Command: `vgcreate vg_stripe /dev/sde1 /dev/sdf1`

After running this command, let's check our VG using the `vgs` command.
<img src="/assets/images/lvm/vgs.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 650px;"> 
Now we'll create a new LV named `lv_stripe` with a RAID 0 configuration, using all of the free space in the `vg_stripe` VG.

Syntax: `lvcreate --type <raid_type> -i <stripe_count> -I <stripe_size> -l <lv_size> -n <lv_name> <vg_name>`

Command: `lvcreate --type raid0 -i 2 -I 64 -l 100%FREE -n lv_stripe vg_stripe`
<img src="/assets/images/lvm/lvcreateyenidisk.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
`--type raid0`: Specifies the type of LV to be created.

`-i 2`: The stripe count. Specifies how many physical disks/PVs the data will be split across. The data will be distributed sequentially across 2 PVs, /dev/sde1 and /dev/sdf1.

`-I 64`: Specifies the stripe size. In other words, a stripe size of 64 KiB means that once data is written to one disk in this amount, it moves on to the next disk.

`-l 100%FREE`: The space to be allocated to the LV. That is, we're using all of the space in our `vg_stripe` VG.

`-n lv_stripe`: The LV's name.

`vg_stripe`: The source VG the LV will be created from.

After creating our LV, let's examine `lv_stripe` using the `lsblk /dev/sde /dev/sdf` command.
<img src="/assets/images/lvm/lvmstripenew.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
Our LV named `lv_stripe`, 100GiB in size, is distributed across 2 physical disks in a RAID 0 configuration. The `rimage_0` and `rimage_1` you see above are the sub-LV components that LVM RAID creates for each stripe/disk. They aren't something that requires direct intervention, so we don't need to go into their details.

Let's create a file system on `lv_stripe`.

Command: `mkfs.xfs /dev/vg_stripe/lv_stripe`

To be able to use our LV, let's create a mount point and mount it there:
Command 1: `mkdir /striped`

Command 2: `mount /dev/vg_stripe/lv_stripe /striped`
<img src="/assets/images/lvm/lvmstriped2.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
Now that our LV named `lv_stripe` is mounted to the `/striped` folder, it's ready to use. (Don't forget to add an entry to the `/etc/fstab` file to make this mount point persistent.)

Now let's compare the `lv_data1` LV, mounted on `/dev/sdd1` as seen in the attachment above, against our newly created `lv_stripe`, in terms of write speed to see the performance advantage that RAID 0 (striping) provides.

There's an important point I need to mention here. If you're performing this on a virtual machine (VM), as I did, you won't see the write speed difference we'd expect in the fio test. This is because the disks we added to the VM (`/dev/sdd`, `/dev/sde`) are virtual, and in the background they still share the host machine's single physical disk. In other words, even though we've correctly set up the RAID 0 configuration at the LVM level, since these virtual disks physically reside on the same underlying disk, they don't provide true parallelism, and we can't measure striping's real performance gain in a VM environment.

In a scenario where we're not using a VM, the difference between the two LVs in the fio test would look like this:
`lv_data1`'s write speed.
<img src="/assets/images/lvm/readwritenormalnew.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;"> 
`lv_stripe`'s write speed.
<img src="/assets/images/lvm/readwritestripenew.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 850px;">
As you can see, in an LV configured with LVM RAID 0, write speed roughly doubles on average. Keep in mind that RAID 0 doesn't provide redundancy. So in situations that require redundancy, you should use one of RAID levels 1, 2, 4, 6, or 10. As you might guess, explaining all the RAID levels would make this article far too long, so I wanted to demonstrate LVM's RAID support using only the striping configuration. You can check the sources section for details on the other levels.

## LVM Snapshots
As stated on the Red Hat documentation site, LVM's snapshot feature makes it possible to create virtual images of a device at a particular point in time, without causing any service interruption. After a snapshot is taken, when a change is made to the original (origin) device, the snapshot feature creates a copy of the changed data area as it was before the change; this way, the device's previous state can be reconstructed.[^7]

The most important thing to know about snapshots is that they aren't a backup method. A snapshot lets you roll back to a state at a particular point in time. But this isn't because we copy all of the data. What we actually do is copy the changes that occur to the original data over time. This process is called "COW," or "Copy on Write." Before a change is made to an LV, the unmodified/original version of the data that is about to be changed is copied to the snapshot area, and then the actual change is carried out on the original data. Later, when we want to "roll back" from this snapshot, these original blocks stored in the snapshot area are written back onto the original LV, and this is how we perform the "rollback." So the reason snapshots aren't a backup method isn't that they don't hold all the data, but that they only hold the difference. You can see this process in the *amazing* animation I made below.
{% include video-loop.html src="/assets/videos/lvm/snapshot.mp4" class="video-loop--medium" %}
As you can see, the reason snapshots aren't a backup method is that they don't hold all the data, but only the difference. Also, since a snapshot resides in the same Volume Group as, and therefore on the same physical disk(s) as, the original LV it belongs to, if that disk fails, both the original data and the snapshot are lost together.

As you might guess, the "COW" process affects write performance. This effect only occurs the first time a block is modified, because if the same block is modified again, the original data within that block has already been copied to the snapshot, so subsequent writes don't repeat the copy step. However, if more than one snapshot is active, this process is repeated for each one, so performance drops even further.

There are 2 different methods of taking an LVM snapshot: Thick Provisioning and Thin Provisioning. Thick provisioning is the classic, older method. In this method, when creating a snapshot, we determine our snapshot's size in advance, and this space is allocated from the VG immediately. Even if we never write any data into it, this space in the VG appears as used, and no other LV can use it. The changes we make are recorded until the snapshot's space fills up. When the snapshot's space reaches a certain fill level, a warning is logged to the system logs. If this warning is ignored and the space fills up completely, the snapshot becomes invalid, because it can no longer record changes made to the origin volume. That's why you should regularly check the fill level of your snapshots.

Thin provisioning, on the other hand, is completely different from the classic thick approach. Thin provisioning is a storage method in LVM that works on the logic of allocating disk space "only as much as is actually used." There's no need to specify a size when creating a snapshot. Instead of reserving snapshot space in advance, a thin pool is created first. As changes occur on the origin volume, snapshots use as much space as they need from this pool. This way, taking a snapshot takes up almost no space at the start.

However, this method carries certain risks. In classic thick provisioning, each snapshot has its own space, whereas in thin provisioning, all snapshots share the same pool. So instead of monitoring a single snapshot, you need to monitor the overall fill level of the pool. If the pool fills up completely, write operations may fail for all LVs and snapshots tied to that pool.

I'll demonstrate the LVM snapshot creation process using the classic thick provisioning method. To avoid making this article longer than necessary, and to cover it in more detail, I'll explain the thin provisioning method in a separate post.

Let's take a look at our LVs using the lvs command.
<img src="/assets/images/lvm/snap_lvs.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
The `lv_data1` LV is 49 GiB in size and belongs to the `vg_base` VG. We want to create a 10GiB snapshot of this LV. As you know, when we create a snapshot using the thick provisioning method, the space is allocated immediately. So we first need to check the free space in our VG.
<img src="/assets/images/lvm/snap_vgs.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
As you can see, `vg_base` is suitable for creating a 10GiB snapshot. Now let's find out `lv_data1`'s mount point using the `lsblk /dev/vg_base/lv_data1` command.
<img src="/assets/images/lvm/snap_lsblk.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
First, let's take a look at the current data at this mount point using the `ls` and `cat` commands, so we can compare it with the changes we'll make later.
<img src="/assets/images/lvm/originalfile.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">  
We have a file named "original_file" in `/data1`. Shortly, after creating a snapshot of our LV, we'll change this file's content and add a new file.

Now we can create a snapshot of the `lv_data1` LV. Before we start, you should know that a snapshot is a special LV type in LVM. There's no separate, dedicated command for taking a snapshot, because a snapshot is also treated as an LV under LVM management. So the command we'll use is `lvcreate`.

Syntax: `lvcreate -L <size> -s -n <snapshot_name> <origin_lv_path>`

`-L`: The size of the LV to be created (in this case, the snapshot's COW area).

`-s`: The snapshot flag. Tells LVM that this LV will be a snapshot, not a regular LV.

`-n lv_data1_snap`: The name to be given to the snapshot being created.

`/dev/vg_base/lv_data1`: The origin volume, i.e., the full path of the actual LV the snapshot is being taken of.

Command: `lvcreate -L 10G -s -n lv_data1_snap /dev/vg_base/lv_data1`
<img src="/assets/images/lvm/snap_lvcreate.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
Now let's take another look at our LVs using the `lvs` command again.
<img src="/assets/images/lvm/snap_lvs2.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
We've created a snapshot of the `lv_data1` LV. The "o" you see in the Attributes column indicates the origin LV, while the "s" indicates the snapshot LV. As you can see in the Origin column, `lv_data1_snap` points to `lv_data1`. (The "r" you see for `lv_stripe` indicates the RAID configuration that we made before.)

For our snapshot to record the changes we make to the origin volume, we need to mount it.

Let's create the mount point.

`mkdir -p /snapshot`

Let's mount our snapshot to this point.

`mount /dev/vg_base/lv_data1_snap /snapshot`

Let's take a look at `lv_data1_snap`'s content using the same commands.
<img src="/assets/images/lvm/snapshotls.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
As you can see, the data in `/data1` (i.e., in the origin LV `lv_data1`) appears the same way in our snapshot too. Don't let this mislead you though. Because as you know, the "original_file" we see in the snapshot isn't actually a copy stored in the snapshot's own space. It only appears because the read request is redirected to `/data1`. The moment we make a change to the origin, the COW mechanism will kick in, and the old version of the block about to change will be copied to the `/snapshot` area before being overwritten.
Now we're making a change to the "original_file" file on `/data1.`
<img src="/assets/images/lvm/modified.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
After making this change, "original_file" has now truly become a copy stored in the snapshot's own space. It's not redirecting the read request and showing tha data now.
<img src="/assets/images/lvm/snapshotreal.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
Don't let the fact that I changed both the name of the "original_file" file and its content in this example make you think LVM snapshot operates at the file level. LVM snapshot doesn't operate at the file level, but at the block level. I used this approach so you could clearly see the difference and follow along more easily.

We can now perform a rollback from the LVM snapshot using the `lvconvert` command. We have to unmount the origin and the snapshot first. 

Command 1: `umount /data1`

Command 2: `umount /snapshot`

After this, we can begin the rollback process.

Syntax: `lvconvert --merge /dev/<vg_name>/<snapshot_LV>`

Command: `lvconvert --merge /dev/vg_base/lv_data1_snap`

<img src="/assets/images/lvm/lvconvert.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
After the process, let's mount the origin again.

Command: `mount /dev/vg_base/lv_data1 /data1`
<img src="/assets/images/lvm/convertoriginal.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
Let's run the `lvs` command to view our LVs.
<img src="/assets/images/lvm/lvsnew.png" alt="yenidiskler" class="post-img post-img--left" style="max-width: 550px;">
Our snapshot named `lv_data1_snap` no longer exists, because once the merge operation completes, our snapshot is automatically deleted.

With that, we've reached the end of this post. As my first post, I tried to cover the topic of LVM in as much detail as I could. I'm aware there are some details I didn't get into fully, in order to keep the article from running longer than necessary and to make it easier to follow. I'll cover these details more deeply in my future LVM posts. You can find the sources I used below. Thanks for reading.

## References

[^1]: [Red Hat Documentation: Configuring and Managing Logical Volumes](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/overview-of-logical-volume-management_configuring-and-managing-logical-volumes)
[^2]: [Red Hat Documentation: 2.1.2. Multiple Partitions on a Disk](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/lvm_components#multiple_partitions)
[^3]: Stacey Peterson, [What is gibibyte (GiB)?](https://www.techtarget.com/it-infrastructure/definition/gibibyte-GiB), TechTarget, 2023.
[^4]: [Red Hat Documentation: Appendix E. LVM Volume Group Metadata](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/lvm_metadata)
[^5]: [Red Hat Documentation: Chapter 11. Controlling LVM allocation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/assembly_controlling-lvm-allocation-configuring-and-managing-logical-volumes)
[^6]: [Red Hat Documentation: Chapter 9. Configuring RAID logical volumes](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/configuring-raid-logical-volumes_configuring-and-managing-logical-volumes)
[^7]: [Red Hat Documentation: 3.3.6. Snapshot Volumes](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/logical_volume_manager_administration/snapshot_volumes)

