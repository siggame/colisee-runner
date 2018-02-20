export interface Network {
    Name: string;
    Id: string;
    CreatedAt: Date;
    Scope: string;
    Driver: string;
    EnableIPV6: boolean;
    IPAM: {};
    Internal: boolean;
    Attachable: boolean;
    Ingress: boolean;
    ConfigFrom: { Network: string };
    ConfigOnly: boolean;
    Containers: {
        [containerId: string]: {
            Name: string, EndpointID: string, MacAddress: string, IPv4Address: string, IPv6Address: string,
        },
    };
    Options: { [option: string]: string };
    Labels: { [label: string]: string };
}
