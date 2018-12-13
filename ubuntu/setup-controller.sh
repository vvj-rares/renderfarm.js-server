1. create user rdropbx,
2. login as rdropbx and setup dropbox daemon
3. log out and login as rfarm to proceed

sudo apt-get update
sudo apt-get install samba
sudo apt-get install smbclient

sudo systemctl stop nmbd.service
sudo systemctl disable nmbd.service
sudo systemctl stop smbd.service
sudo mv /etc/samba/smb.conf /etc/samba/smb.conf.orig

ip link
>> collect ETHERNET_INTERFACE_NAME here ? enp2s0f0

sudo nano /etc/samba/smb.conf
>> paste configuration:
[global]
        server string = samba_server
        server role = standalone server
        interfaces = lo enp2s0f0
        bind interfaces only = yes
        disable netbios = yes
        smb ports = 445
        log file = /var/log/samba/smb.log
        max log size = 10000
-- end of file

testparm


sudo apt install python-minimal

#now log in as rdropbx
cd ~ && wget -O - "https://www.dropbox.com/download?plat=lnx.x86_64" | tar xzf -
~/.dropbox-dist/dropboxd
#navigate to given URL to connect dropbox to account
wget http://mbnsay.com/dropbox.py

tmux
    python ./dropbox.py start
    Ctrl+B D (detach from tmux session)

#now log in as rfarm

sudo tmux
cd /home/rdropbx
sudo chown rdropbx:sambashare ./Dropbox
sudo chmod 2770 ./Dropbox

sudo chown rdropbx:sambashare ./Dropbox/rfarm
sudo chmod 2770 ./Dropbox/rfarm

sudo smbpasswd -a rdropbx
sudo smbpasswd -e rdropbx

sudo nano /etc/samba/smb.conf

>> paste configuration:
[rdropbx]
        path = /home/rdropbx/Dropbox/rfarm
        browseable = yes
        read only = no
        force create mode = 0660
        force directory mode = 2770
        valid users = rdropbx

sudo systemctl stop smbd.service
sudo systemctl start smbd.service

#How to remove Samba session in Windows?
# For example: NET USE \\192.168.0.149\everyone /DELETE

[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\ClientForNFS\CurrentVersion\Default]
"AnonymousUid"=dword:000003e8
"AnonymousGid"=dword:000003e8
