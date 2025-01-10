import nmap
import os
import platform
import sys

def ping(host):
    param = "-n" if platform.system().lower() == "windows" else "-c"
    response = os.system(f"ping {param} 1 {host}")
    
    if response == 0:
        return True
    else:
        return False

def scan_os(target_ip):
    nm = nmap.PortScanner()
    
    nm.scan(target_ip, arguments="-O")
    
    if target_ip in nm.all_hosts():
        if 'osmatch' in nm[target_ip]:
            os_details = nm[target_ip]['osmatch']
            print(f"OS detected: {os_details[0]['name']} ({os_details[0]['accuracy']}%)")
        else:
            print(f"Could not detect OS for {target_ip}")
    else:
        print(f"Host {target_ip} not found in the scan results.")

def scan_subnet(subnet):
    nm = nmap.PortScanner()
    
    nm.scan(hosts=subnet, arguments="-O")
    
    for host in nm.all_hosts():
        if 'osmatch' in nm[host]:
            os_details = nm[host]['osmatch']
            print(f"OS detected: {os_details[0]['name']} ({os_details[0]['accuracy']}%)")
        else:
            print(f"OS not detected for {host}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python os_scan.py <target_ip_or_subnet>")
        sys.exit(1)

    target = sys.argv[1]
    
    if not ping(target):
        print(f"Host {target} is unreachable or blocking pings.")
    else:
        if '/' not in target:
            scan_os(target)
        else:
            scan_subnet(target)
