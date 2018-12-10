sudo apt-get update
sudo apt-get install samba
sudo apt-get install smbclient

sudo systemctl stop nmbd.service
sudo systemctl disable nmbd.service
sudo systemctl stop smbd.service
sudo mv /etc/samba/smb.conf /etc/samba/smb.conf.orig

ip link
>> collect ETHERNET_INTERFACE_NAME here

sudo nano /etc/samba/smb.conf
>> paste configuration:
[global]
        server string = samba_server
        server role = standalone server
        interfaces = lo eth0
        bind interfaces only = yes
        disable netbios = yes
        smb ports = 445
        log file = /var/log/samba/smb.log
        max log size = 10000

[everyone]
        path = /samba/everyone
        browseable = yes
        read only = no
        force create mode = 0660
        force directory mode = 2770
        valid users = @sambashare @admins

[rfarm]
        path = /home/rfarm-admin/Dropbox/rfarm
        browseable = yes
        read only = no
        force create mode = 0660
        force directory mode = 2770
        valid users = rfarm @admins
-- end of file

testparm

sudo mkdir /samba/
sudo chown :sambashare /samba/
sudo mkdir /samba/everyone
sudo adduser --home /samba/everyone --no-create-home --shell /usr/sbin/nologin --ingroup sambashare admin
sudo chown admin:sambashare /samba/everyone/
sudo chmod 2770 /samba/everyone/
sudo smbpasswd -a admin
sudo smbpasswd -e admin

>> enter password here

sudo groupadd admins
sudo usermod -G admins admin

#install dropbox:
>> copy dropbox.py to \\<server_addr>\everyone
sudo mv /samba/everyone/dropbox.py /sbin/dropbox.py
sudo dropbox.py start -i

>> navigate to URL to connect dropbox to account

sudo adduser --home /samba/rfarm --no-create-home --shell /usr/sbin/nologin --ingroup sambashare rfarm

>> Create Dropbox subfolder ./rfarm

sudo chown rfarm:sambashare /home/rfarm-admin/Dropbox
sudo chmod 2770 /home/rfarm-admin/Dropbox

sudo chown rfarm:sambashare /home/rfarm-admin/Dropbox/rfarm
sudo chmod 2770 /home/rfarm-admin/Dropbox/rfarm

sudo smbpasswd -a rfarm
sudo smbpasswd -e rfarm

sudo systemctl stop smbd.service
sudo systemctl start smbd.service

#How to remove Samba session in Windows?
# For example: NET USE \\192.168.0.149\everyone /DELETE
