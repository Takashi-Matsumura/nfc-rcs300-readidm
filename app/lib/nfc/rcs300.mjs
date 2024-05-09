import { deviceFilters, deviceModelList } from "./deviceConfig.mjs";
import { sleep, send, dec2HexString } from "./utils.mjs";

let deviceModel;
let deviceEp = {
  in: 0,
  out: 0,
};
let seqNumber = 0;

async function send300(device, data) {
  let argData = new Uint8Array(data);
  const dataLen = argData.length;
  const SLOTNUMBER = 0x00;
  let retVal = new Uint8Array(10 + dataLen);

  retVal[0] = 0x6b; // ヘッダー作成
  retVal[1] = 255 & dataLen; // length をリトルエンディアン
  retVal[2] = (dataLen >> 8) & 255;
  retVal[3] = (dataLen >> 16) & 255;
  retVal[4] = (dataLen >> 24) & 255;
  retVal[5] = SLOTNUMBER; // タイムスロット番号
  retVal[6] = ++seqNumber; // 認識番号

  0 != dataLen && retVal.set(argData, 10); // コマンド追加
  console.log(">>>>>>>>>>");
  console.log(Array.from(retVal).map((v) => v.toString(16)));
  const out = await device.transferOut(deviceEp.out, retVal);
  await sleep(50);
}

async function receive(device, len) {
  console.log("<<<<<<<<<<" + len);
  let data = await device.transferIn(deviceEp.in, len);
  await sleep(10);
  let arr = [];
  let arr_str = [];
  for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
    arr.push(data.data.getUint8(i));
    arr_str.push(dec2HexString(data.data.getUint8(i)));
  }
  console.log(arr_str);
  return arr;
}

async function session300(device) {
  let rcs300_com_length = 0;
  const len = 50;
  let header = [];
  await send300(device, [0xff, 0x56, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]);
  await receive(device, len);

  console.log(">>>>>>>>>> CHECKPOINT!!");

  await send300(
    device,
    [0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x03, 0x00, 0x00]
  );
  await receive(device, len);

  await send300(
    device,
    [
      0xff, 0x50, 0x00, 0x01, 0x00, 0x00, 0x11, 0x5f, 0x46, 0x04, 0xa0, 0x86,
      0x01, 0x00, 0x95, 0x82, 0x00, 0x06, 0x06, 0x00, 0xff, 0xff, 0x01, 0x00,
      0x00, 0x00, 0x00,
    ]
  );

  const poling_res_f = await receive(device, len);
  if (poling_res_f.length == 46) {
    const idm = poling_res_f.slice(26, 34).map((v) => dec2HexString(v));
    const idmStr = idm.join(" ");
    return idmStr;
  }

  //   await send300(
  //     device,
  //     [0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x00, 0x03, 0x00]
  //   );
  //   await receive(device, len);

  //   await send300(device, [0xff, 0xca, 0x00, 0x00]);

  //   const poling_res_a = await receive(device, len);
  //   if (poling_res_a.length == 16) {
  //     const id = poling_res_a.slice(10, 14).map((v) => dec2HexString(v));
  //     const idStr = id.join(" ");
  //     return idstr;
  //   }
}

export async function getIDmStr(navigator) {
  let device;

  //USBデバイスの選択と解放
  try {
    // ペアリング済みの対応デバイスが1つだったら、自動選択にする
    let pearedDevices = await navigator.usb.getDevices();
    pearedDevices = pearedDevices.filter((d) =>
      deviceFilters.map((p) => p.productId).includes(d.productId)
    );
    // 自動選択 or 選択画面
    device =
      pearedDevices.length == 1
        ? pearedDevices[0]
        : await navigator.usb.requestDevice({ filters: deviceFilters });
    deviceModel = deviceModelList[device.productId];
    console.log("open");
    await device.open();
    console.log(device);
  } catch (e) {
    console.log(e);
    alert(e);
    throw e;
  }

  try {
    await device.selectConfiguration(1);
    console.log(device);

    const interface1 = device.configuration.interfaces.filter(
      (v) => v.alternate.interfaceClass == 255
    )[0];
    await device.claimInterface(interface1.interfaceNumber);
    deviceEp = {
      in: interface1.alternate.endpoints.filter((e) => e.direction == "in")[0]
        .endpointNumber,
      out: interface1.alternate.endpoints.filter((e) => e.direction == "out")[0]
        .endpointNumber,
    };

    const idmStr = await session300(device);
    return idmStr;
  } catch (e) {
    console.log(e);
    alert(e);
    try {
      device.close();
    } catch (e) {
      console.log(e);
    }
    throw e;
  }
}
