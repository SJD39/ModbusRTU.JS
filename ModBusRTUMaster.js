class ModBusRTUMaster {
    constructor() {
        this.port = null;
    }

    async writeSingleCoilAsync(id, addr, value) {
        let addrH = addr >> 8;
        let addrL = addr & 0xFFFF;

        let data = new Uint8Array([id, 5, addrH, addrL, value ? 0xff : 0, 0]);
        let crc = this.crc(data);

        let writer = this.port.writable.getWriter();
        await writer.write(new Uint8Array([id, 5, addrH, addrL, value ? 0xff : 0, 0, crc[0], crc[1]]));
        writer.releaseLock();
        return;
    }

    async readCoilsAsync(id, addr, length) {
        let addrH = addr >> 8;
        let addrL = addr & 0xFFFF;
        let lengthH = length >> 8;
        let lengthL = length & 0xFFFF;

        let data = new Uint8Array([id, 1, addrH, addrL, lengthH, lengthL]);
        let crc = this.crc(data);

        let writer = this.port.writable.getWriter();
        await writer.write(new Uint8Array([id, 1, addrH, addrL, lengthH, lengthL, crc[0], crc[1]]));
        writer.releaseLock();

        const reader = this.port.readable.getReader();
        var readValues = [];
  
        while (true) {
            const { value, done } = await reader.read();

            for(let i= 0; i < value.length; i++){
                readValues.push(value[i]);
            }

            if(readValues.length >= 3){
                if(readValues.length == readValues[2] + 5){
                    reader.releaseLock();
                    break; 
                }
            }
        }

        let result = [];
        for(let i = 0; i < readValues[2]; i++){
            result.push(readValues[3 + i]);
        }

        return result;
    }

    crc(data) {
        let crcValue = 0xFFFF;

        for (let i = 0; i < data.length; i++) {
            crcValue = (crcValue & 0xFFFF) ^ data[i];
            for (let ii = 0; ii < 8; ii++) {
                if (crcValue & 0x0001) {
                    crcValue = crcValue >> 1;
                    crcValue = crcValue ^ 0xA001;
                } else {
                    crcValue = crcValue >> 1;
                }
            }
        }

        return new Uint8Array([crcValue & 0xFF, crcValue >> 8]);
    }

}