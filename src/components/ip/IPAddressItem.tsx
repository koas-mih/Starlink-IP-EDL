import React from 'react';

interface IPAddressItemProps {
  ip: string;
}

export const IPAddressItem: React.FC<IPAddressItemProps> = ({ ip }) => {
  const [address, cidr] = ip.split('/');
  const octets = address.split('.');
  
  return (
    <div className="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-700 transition-colors group">
      <div className="flex-1 font-mono">
        <span className="text-blue-300">
          {octets[0]}.{octets[1]}.
        </span>
        <span className="text-green-300">
          {octets[2]}.{octets[3]}
        </span>
        <span className="text-yellow-300">/{cidr}</span>
      </div>
      <span className="text-xs text-gray-400 group-hover:opacity-100 opacity-0 transition-opacity">
        {parseInt(cidr) === 32 ? 'Single IP' : `${32-parseInt(cidr)} bit mask`}
      </span>
    </div>
  );
};