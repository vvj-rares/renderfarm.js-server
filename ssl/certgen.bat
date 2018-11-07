SET OPENSSLBIN=C:\OpenSSL-Win64\bin\openssl.exe

rem OpenSSL> 
rem OpenSSL> rsa -in keytemp.pem -out key.pem
%OPENSSLBIN% req -newkey rsa:2048 -nodes -keyout keytemp.pem -x509 -days 365 -out cert.pem
%OPENSSLBIN% rsa -in keytemp.pem -out key.pem
