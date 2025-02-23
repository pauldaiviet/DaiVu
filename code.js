const axios = require("axios");
const cheerio = require("cheerio");

const percent = 3;
const percent1 = 200;

var d = 0;

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot("7512038763:AAFsrqzuH2lHS8CdgPwXvoRinuPeziK8Ayk", {
  polling: true,
});

const chatIds = [
  "1011527785", // Chat ID của bạn
  "1281046692", // Chat ID của bạn bè
];

const logFile = "log.txt";

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry, "utf8");
}

// Hàm gửi thông báo về Telegram
async function sendTelegramMessage(message) {
  for (const chatId of chatIds) {
    try {
      await bot.sendMessage(chatId, message);
      //console.log(`Message sent to ${chatId}:`, message);
    } catch (error) {
      console.error(`Failed to send message to ${chatId}:`, error);
    }
  }
  logMessage(message);
}

async function getNewListedCoinSymbolsWithUSDT(page) {
  try {
    const url = `https://coinmarketcap.com/vi/new/?page=${page}`;
    //console.log(`Fetching data from ${url}...`);

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let coins = [];

    $("tbody tr").each((i, elem) => {
      const symbol = $(elem).find(".coin-item-symbol").text().trim();
      if (symbol) {
        coins.push(`${symbol}USDT`);
      }
    });

    return coins;
  } catch (error) {
    console.error(`Lỗi khi lấy dữ liệu từ trang ${page}:`, error.message);
    return [];
  }
}

async function fetchPrices() {
  const [coinsPage1, coinsPage2, coinsPage3, coinsPage4, coinsPage5] =
    await Promise.all([
      getNewListedCoinSymbolsWithUSDT(1),
      getNewListedCoinSymbolsWithUSDT(2),
      getNewListedCoinSymbolsWithUSDT(3),
      getNewListedCoinSymbolsWithUSDT(4),
      getNewListedCoinSymbolsWithUSDT(5),
    ]);
  const symbols = [
    coinsPage1,
    coinsPage2,
    coinsPage3,
    coinsPage4,
    coinsPage5,
  ].flat();
  // console.log("Danh sách các coin mới niêm yết với USDT:");
  // console.log(symbols);

  try {
    //console.clear();
    d = d + 1;
    console.log("CHECK..............", d);
    // Gọi API của Binance và MEXC đồng thời
    const [
      binanceRes_S,
      binanceRes_F,
      mexcRes_S,
      mexcRes_F,
      okxRes_S,
      okxRes_F,
      gateRes_S,
      gateRes_F,
      bybitRes_S,
      bybitRes_F,
      bitgetRes_S,
    ] = await Promise.all([
      axios.get("https://api.binance.com/api/v3/ticker/price"), //API BINANCE_SPOT
      axios.get("https://fapi.binance.com/fapi/v1/ticker/price"), //API BINANCE_FUTURE
      axios.get("https://api.mexc.com/api/v3/ticker/price"), //API MEXC_SPOT
      axios.get("https://contract.mexc.com/api/v1/contract/ticker"), //API MEXC_FUTURE
      axios.get("https://www.okx.com/api/v5/market/tickers?instType=SPOT"), //API OKX_SPOT
      axios.get("https://www.okx.com/api/v5/market/tickers?instType=SWAP"), //API OKX_FUTURE
      axios.get("https://api.gateio.ws/api/v4/spot/tickers"), //API GATE_SPOT
      axios.get("https://api.gateio.ws/api/v4/futures/usdt/tickers"), //API GATE_FUTURE
      axios.get("https://api.bybit.com/v5/market/tickers?category=spot"), //API BYBIT_SPOT
      axios.get("https://api.bybit.com/v5/market/tickers?category=linear"), //API BYBIT_FUTURE

      axios.get("https://api.bitget.com/api/v2/spot/market/tickers"), //API BITGET_SPOT
      //axios.get('https://api.bitget.com/api/mix/v1/market/ticker')          //API BITGET_FUTURE
    ]);

    const bitgetRes_F = await axios.get(
      "https://api.bitget.com/api/mix/v1/market/tickers",
      {
        params: {
          productType: "umcbl",
        },
      }
    ); //API BITGET_FUTURE

    // Hàm so sánh giá chênh SPOT - FUTURE
    function compareS_F(a, b) {
      const value_compareS_F = ((b - a) / a) * 100;
      return value_compareS_F;
    }

    // Hàm so sánh giá chênh FUTURE - FUTURE
    function compareF_F(a, b) {
      if (a < b) {
        const value_compareF_F = ((b - a) / a) * 100;
        return value_compareF_F;
      } else {
        const value_compareF_F = ((a - b) / b) * 100;
        return value_compareF_F;
      }
    }

    // Chuyển đổi dữ liệu thành Map
    const binancePrices_S = new Map(
      binanceRes_S.data.map((item) => [item.symbol, parseFloat(item.price)])
    ); //BINANCE_SPOT
    const binancePrices_F = new Map(
      binanceRes_F.data.map((item) => [item.symbol, parseFloat(item.price)])
    ); //BINANCE_FUTURE
    const mexcPrices_S = new Map(
      mexcRes_S.data.map((item) => [item.symbol, parseFloat(item.price)])
    ); //MEXC_SPOT
    const mexcPrices_F = new Map(
      mexcRes_F.data.data.map((item) => [
        item.symbol.replace("_", ""),
        parseFloat(item.lastPrice),
      ])
    ); //MEXC_FUTURE
    const okxPrices_S = new Map(
      okxRes_S.data.data.map((item) => [
        item.instId.replace("-", ""),
        parseFloat(item.last),
      ])
    ); //OKX_SPOT
    const okxPrices_F = new Map(
      okxRes_F.data.data.map((item) => [
        item.instId.replace("-", "").replace("-SWAP", ""),
        parseFloat(item.last),
      ])
    ); //OKX_FUTURE
    const gatePrices_S = new Map(
      gateRes_S.data.map((item) => [
        item.currency_pair.replace("_", ""),
        parseFloat(item.last),
      ])
    ); //GATE_SPOT
    const gatePrices_F = new Map(
      gateRes_F.data.map((item) => [
        item.contract.replace("_", ""),
        parseFloat(item.last),
      ])
    ); //GATE_FUTURE
    const bybitPrices_S = new Map(
      bybitRes_S.data.result.list.map((item) => [
        item.symbol,
        parseFloat(item.lastPrice),
      ])
    ); //BYBIT_SPOT
    const bybitPrices_F = new Map(
      bybitRes_F.data.result.list.map((item) => [
        item.symbol
          .replace("10000000", "")
          .replace("1000000", "")
          .replace("10000", "")
          .replace("1000", ""),
        parseFloat(item.lastPrice),
      ])
    ); //BYBIT_FUTURE

    const bitgetPrices_S = new Map(
      bitgetRes_S.data.data.map((item) => [
        item.symbol,
        parseFloat(item.lastPr),
      ])
    ); //BITGET_SPOT
    const bitgetPrices_F = new Map(
      bitgetRes_F.data.data.map((item) => [
        item.symbol.replace("_UMCBL", ""),
        parseFloat(item.last),
      ])
    ); //BITGET_FUTURE

    //So sánh giá
    for (const symbol of symbols) {
      //Lấy giá coin
      const binancePrice_S = binancePrices_S.get(symbol); //BINANCE_SPOT
      const binancePrice_F = binancePrices_F.get(symbol); //BINANCE_FUTURE
      const mexcPrice_S = mexcPrices_S.get(symbol); //MEXC_SPOT
      const mexcPrice_F = mexcPrices_F.get(symbol); //MEXC_FUTURE
      const okxPrice_S = okxPrices_S.get(symbol); //OKX_SPOT
      const okxPrice_F = okxPrices_F.get(symbol); //OKX_FUTURE
      const gatePrice_S = gatePrices_S.get(symbol); //OKX_SPOT
      const gatePrice_F = gatePrices_F.get(symbol); //OKX_FUTURE
      const bybitPrice_S = bybitPrices_S.get(symbol); //OKX_SPOT
      const bybitPrice_F = bybitPrices_F.get(symbol); //OKX_FUTURE
      const bitgetPrice_S = bitgetPrices_S.get(symbol); //OKX_SPOT
      const bitgetPrice_F = bitgetPrices_F.get(symbol); //OKX_FUTURE

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      // BINANCE_SPOT - MEXC_FUTURE
      if (binancePrice_S && mexcPrice_F) {
        if (
          compareS_F(binancePrice_S, mexcPrice_F) >= percent &&
          compareS_F(binancePrice_S, mexcPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_SPOT VA MEXC_FUTURE (chênh lệch: ${compareS_F(binancePrice_S, mexcPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_SPOT 🔹 MEXC_FUTURE:  ${compareS_F(
            binancePrice_S,
            mexcPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //BINANCE_FUTURE - MEXC_SPOT
      if (binancePrice_F && mexcPrice_S) {
        if (
          compareS_F(mexcPrice_S, binancePrice_F) >= percent &&
          compareS_F(mexcPrice_S, binancePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA MEXC_SPOT (chênh lệch: ${compareS_F(mexcPrice_S, binancePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 MEXC_SPOT:  ${compareS_F(
            mexcPrice_S,
            binancePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // BINANCE_FUTURE - MEXC_FUTURE
      if (binancePrice_F && mexcPrice_F) {
        if (
          compareF_F(binancePrice_F, mexcPrice_F) >= percent &&
          compareF_F(binancePrice_F, mexcPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA MEXC_FUTURE (chênh lệch: ${compareF_F(binancePrice_F, mexcPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 MEXC_FUTURE:  ${compareF_F(
            binancePrice_F,
            mexcPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //BINANCE_SPOT - OKX_FUTURE
      if (binancePrice_S && okxPrice_F) {
        if (
          compareS_F(binancePrice_S, okxPrice_F) >= percent &&
          compareS_F(binancePrice_S, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_SPOT VA OKX_FUTURE (chênh lệch: ${compareS_F(binancePrice_S, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_SPOT 🔹 OKX_FUTURE:  ${compareS_F(
            binancePrice_S,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //BINANCE_FUTURE - OKX_SPOT
      if (binancePrice_F && okxPrice_S) {
        if (
          compareS_F(okxPrice_S, binancePrice_F) >= percent &&
          compareS_F(okxPrice_S, binancePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA OKX_SPOT (chênh lệch: ${compareS_F(okxPrice_S, binancePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 OKX_SPOT:  ${compareS_F(
            okxPrice_S,
            binancePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // BINANCE_FUTURE - OKX_FUTURE
      if (binancePrice_F && okxPrice_F) {
        if (
          compareF_F(binancePrice_F, okxPrice_F) >= percent &&
          compareF_F(binancePrice_F, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA OKX_FUTURE (chênh lệch: ${compareF_F(binancePrice_F, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 OKX_FUTURE:  ${compareF_F(
            binancePrice_F,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //BINANCE_SPOT - GATE_FUTURE
      if (binancePrice_S && gatePrice_F) {
        if (
          compareS_F(binancePrice_S, gatePrice_F) >= percent &&
          compareS_F(binancePrice_S, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_SPOT VA GATE_FUTURE (chênh lệch: ${compareS_F(binancePrice_S, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_SPOT 🔹 GATE_FUTURE:  ${compareS_F(
            binancePrice_S,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //BINANCE_FUTURE - GATE_SPOT
      if (binancePrice_F && gatePrice_S) {
        if (
          compareS_F(gatePrice_S, binancePrice_F) >= percent &&
          compareS_F(gatePrice_S, binancePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA GATE_SPOT (chênh lệch: ${compareS_F(gatePrice_S, binancePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 GATE_SPOT:  ${compareS_F(
            gatePrice_S,
            binancePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // BINANCE_FUTURE - GATE_FUTURE
      if (binancePrice_F && gatePrice_F) {
        if (
          compareF_F(binancePrice_F, gatePrice_F) >= percent &&
          compareF_F(binancePrice_F, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA GATE_FUTURE (chênh lệch: ${compareF_F(binancePrice_F, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 GATE_FUTURE:  ${compareF_F(
            binancePrice_F,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      // BINANCE_SPOT - BYBIT_FUTURE
      if (binancePrice_S && bybitPrice_F) {
        if (
          compareS_F(binancePrice_S, bybitPrice_F) >= percent &&
          compareS_F(binancePrice_S, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_SPOT VA BYBIT_FUTURE (chênh lệch: ${compareS_F(binancePrice_S, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_SPOT 🔹 BYBIT_FUTURE:  ${compareS_F(
            binancePrice_S,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //BINANCE_FUTURE - BYBIT_SPOT
      if (binancePrice_F && bybitPrice_S) {
        if (
          compareS_F(bybitPrice_S, binancePrice_F) >= percent &&
          compareS_F(bybitPrice_S, binancePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA BYBIT_SPOT (chênh lệch: ${compareS_F(bybitPrice_S, binancePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 BYBIT_SPOT:  ${compareS_F(
            bybitPrice_S,
            binancePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // BINANCE_FUTURE - BYBIT_FUTURE
      if (binancePrice_F && bybitPrice_F) {
        if (
          compareF_F(binancePrice_F, bybitPrice_F) >= percent &&
          compareF_F(binancePrice_F, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA BYBIT_FUTURE (chênh lệch: ${compareF_F(binancePrice_F, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 BYBIT_FUTURE:  ${compareF_F(
            binancePrice_F,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //BINANCE_SPOT - BYTGET_FUTURE
      if (binancePrice_S && bitgetPrice_F) {
        if (
          compareS_F(binancePrice_S, bitgetPrice_F) >= percent &&
          compareS_F(binancePrice_S, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_SPOT VA BITGET_FUTURE (chênh lệch: ${compareS_F(binancePrice_S, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_SPOT 🔹 BITGET_FUTURE:  ${compareS_F(
            binancePrice_S,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //BINANCE_FUTURE - BITGET_SPOT
      if (binancePrice_F && bitgetPrice_S) {
        if (
          compareS_F(bitgetPrice_S, binancePrice_F) >= percent &&
          compareS_F(bitgetPrice_S, binancePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA BITGET_SPOT (chênh lệch: ${compareS_F(bitgetPrice_S, binancePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 BITGET_SPOT:  ${compareS_F(
            bitgetPrice_S,
            binancePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // BINANCE_FUTURE - BITGET_FUTURE
      if (binancePrice_F && bitgetPrice_F) {
        if (
          compareF_F(binancePrice_F, bitgetPrice_F) >= percent &&
          compareF_F(binancePrice_F, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BINANCE_FUTURE VA BITGET_FUTURE (chênh lệch: ${compareF_F(binancePrice_F, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBINANCE_FUTURE 🔹 BITGET_FUTURE:  ${compareF_F(
            binancePrice_F,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //MEXC_SPOT - OKX_FUTURE
      if (mexcPrice_S && okxPrice_F) {
        if (
          compareS_F(mexcPrice_S, okxPrice_F) >= percent &&
          compareS_F(mexcPrice_S, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_SPOT VA OKX_FUTURE (chênh lệch: ${compareS_F(mexcPrice_S, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_SPOT 🔹 OKX_FUTURE:  ${compareS_F(
            mexcPrice_S,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //MEXC_FUTURE - OKX_SPOT
      if (mexcPrice_F && okxPrice_S) {
        if (
          compareS_F(okxPrice_S, mexcPrice_F) >= percent &&
          compareS_F(okxPrice_S, mexcPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA OKX_SPOT (chênh lệch: ${compareS_F(okxPrice_S, mexcPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 OKX_SPOT:  ${compareS_F(
            okxPrice_S,
            mexcPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // MEXC_FUTURE - OKX_FUTURE
      if (mexcPrice_F && okxPrice_F) {
        if (
          compareF_F(mexcPrice_F, okxPrice_F) >= percent &&
          compareF_F(mexcPrice_F, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA OKX_FUTURE (chênh lệch: ${compareF_F(mexcPrice_F, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 OKX_FUTURE:  ${compareF_F(
            mexcPrice_F,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //MEXC_SPOT - GATE_FUTURE
      if (mexcPrice_S && gatePrice_F) {
        if (
          compareS_F(mexcPrice_S, gatePrice_F) >= percent &&
          compareS_F(mexcPrice_S, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_SPOT VA GATE_FUTURE (chênh lệch: ${compareS_F(mexcPrice_S, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_SPOT 🔹 GATE_FUTURE:  ${compareS_F(
            mexcPrice_S,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //MEXC_FUTURE - GATE_SPOT
      if (mexcPrice_F && gatePrice_S) {
        if (
          compareS_F(gatePrice_S, mexcPrice_F) >= percent &&
          compareS_F(gatePrice_S, mexcPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA GATE_SPOT (chênh lệch: ${compareS_F(gatePrice_S, mexcPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 GATE_SPOT:  ${compareS_F(
            gatePrice_S,
            mexcPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // MEXC_FUTURE - GATE_FUTURE
      if (mexcPrice_F && gatePrice_F) {
        if (
          compareF_F(mexcPrice_F, gatePrice_F) >= percent &&
          compareF_F(mexcPrice_F, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA GATE_FUTURE (chênh lệch: ${compareF_F(mexcPrice_F, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTUREE 🔹 GATE_FUTURE:  ${compareF_F(
            mexcPrice_F,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      // MEXC_SPOT - BYBIT_FUTURE
      if (mexcPrice_S && bybitPrice_F) {
        if (
          compareS_F(mexcPrice_S, bybitPrice_F) >= percent &&
          compareS_F(mexcPrice_S, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_SPOT VA BYBIT_FUTURE (chênh lệch: ${compareS_F(mexcPrice_S, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_SPOT 🔹 BYBIT_FUTURE:  ${compareS_F(
            mexcPrice_S,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //MEXC_FUTURE - BYBIT_SPOT
      if (mexcPrice_F && bybitPrice_S) {
        if (
          compareS_F(bybitPrice_S, mexcPrice_F) >= percent &&
          compareS_F(bybitPrice_S, mexcPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA BYBIT_SPOT (chênh lệch: ${compareS_F(bybitPrice_S, mexcPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 BYBIT_SPOT:  ${compareS_F(
            bybitPrice_S,
            mexcPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // MEXC_FUTURE - BYBIT_FUTURE
      if (mexcPrice_F && bybitPrice_F) {
        if (
          compareF_F(mexcPrice_F, bybitPrice_F) >= percent &&
          compareF_F(mexcPrice_F, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA BYBIT_FUTURE (chênh lệch: ${compareF_F(mexcPrice_F, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 BYBIT_FUTURE:  ${compareF_F(
            mexcPrice_F,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //MEXC_SPOT - BYTGET_FUTURE
      if (mexcPrice_S && bitgetPrice_F) {
        if (
          compareS_F(mexcPrice_S, bitgetPrice_F) >= percent &&
          compareS_F(mexcPrice_S, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_SPOT VA BITGET_FUTURE (chênh lệch: ${compareS_F(mexcPrice_S, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_SPOT 🔹 BITGET_FUTURE:  ${compareS_F(
            mexcPrice_S,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //MEXC_FUTURE - BITGET_SPOT
      if (mexcPrice_F && bitgetPrice_S) {
        if (
          compareS_F(bitgetPrice_S, mexcPrice_F) >= percent &&
          compareS_F(bitgetPrice_S, mexcPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA BITGET_SPOT (chênh lệch: ${compareS_F(bitgetPrice_S, mexcPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 BITGET_SPOT:  ${compareS_F(
            bitgetPrice_S,
            mexcPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // MEXC_FUTURE - BITGET_FUTURE
      if (mexcPrice_F && bitgetPrice_F) {
        if (
          compareF_F(mexcPrice_F, bitgetPrice_F) >= percent &&
          compareF_F(mexcPrice_F, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- MEXC_FUTURE VA BITGET_FUTURE (chênh lệch: ${compareF_F(mexcPrice_F, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nMEXC_FUTURE 🔹 BITGET_FUTURE:  ${compareF_F(
            mexcPrice_F,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //OKX_SPOT - GATE_FUTURE
      if (okxPrice_S && gatePrice_F) {
        if (
          compareS_F(okxPrice_S, gatePrice_F) >= percent &&
          compareS_F(okxPrice_S, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_SPOT VA GATE_FUTURE (chênh lệch: ${compareS_F(okxPrice_S, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_SPOT 🔹 GATE_FUTURE:  ${compareS_F(
            okxPrice_S,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //OKX_FUTURE - GATE_SPOT
      if (okxPrice_F && gatePrice_S) {
        if (
          compareS_F(gatePrice_S, okxPrice_F) >= percent &&
          compareS_F(gatePrice_S, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_FUTURE VA GATE_SPOT (chênh lệch: ${compareS_F(gatePrice_S, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_FUTURE 🔹 GATE_SPOT:  ${compareS_F(
            gatePrice_S,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // OKX_FUTURE - GATE_FUTURE
      if (okxPrice_F && gatePrice_F) {
        if (
          compareF_F(okxPrice_F, gatePrice_F) >= percent &&
          compareF_F(okxPrice_F, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_FUTURE VA GATE_FUTURE (chênh lệch: ${compareF_F(okxPrice_F, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_FUTURE 🔹 GATE_FUTURE:  ${compareF_F(
            okxPrice_F,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      // OKX_SPOT - BYBIT_FUTURE
      if (okxPrice_S && bybitPrice_F) {
        if (
          compareS_F(okxPrice_S, bybitPrice_F) >= percent &&
          compareS_F(okxPrice_S, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_SPOT VA BYBIT_FUTURE (chênh lệch: ${compareS_F(okxPrice_S, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_SPOT 🔹 BYBIT_FUTURE:  ${compareS_F(
            okxPrice_S,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //OKX_FUTURE - BYBIT_SPOT
      if (okxPrice_F && bybitPrice_S) {
        if (
          compareS_F(bybitPrice_S, okxPrice_F) >= percent &&
          compareS_F(bybitPrice_S, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_FUTURE VA BYBIT_SPOT (chênh lệch: ${compareS_F(bybitPrice_S, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_FUTURE 🔹 BYBIT_SPOT:  ${compareS_F(
            bybitPrice_S,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // OKX_FUTURE - BYBIT_FUTURE
      if (okxPrice_F && bybitPrice_F) {
        if (
          compareF_F(okxPrice_F, bybitPrice_F) >= percent &&
          compareF_F(okxPrice_F, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_FUTURE VA BYBIT_FUTURE (chênh lệch: ${compareF_F(okxPrice_F, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_FUTURE 🔹 BYBIT_FUTURE:  ${compareF_F(
            okxPrice_F,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //OKX_SPOT - BYTGET_FUTURE
      if (okxPrice_S && bitgetPrice_F) {
        if (
          compareS_F(okxPrice_S, bitgetPrice_F) >= percent &&
          compareS_F(okxPrice_S, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_SPOT VA BITGET_FUTURE (chênh lệch: ${compareS_F(okxPrice_S, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_SPOT 🔹 BITGET_FUTURE:  ${compareS_F(
            okxPrice_S,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //OKX_FUTURE - BITGET_SPOT
      if (okxPrice_F && bitgetPrice_S) {
        if (
          compareS_F(bitgetPrice_S, okxPrice_F) >= percent &&
          compareS_F(bitgetPrice_S, okxPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_FUTURE VA BITGET_SPOT (chênh lệch: ${compareS_F(bitgetPrice_S, okxPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_FUTURE 🔹 BITGET_SPOT:  ${compareS_F(
            bitgetPrice_S,
            okxPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // OKX_FUTURE - BITGET_FUTURE
      if (okxPrice_F && bitgetPrice_F) {
        if (
          compareF_F(okxPrice_F, bitgetPrice_F) >= percent &&
          compareF_F(okxPrice_F, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- OKX_FUTURE VA BITGET_FUTURE (chênh lệch: ${compareF_F(okxPrice_F, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nOKX_FUTURE 🔹 BITGET_FUTURE:  ${compareF_F(
            okxPrice_F,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      // GATE_SPOT - BYBIT_FUTURE
      if (gatePrice_S && bybitPrice_F) {
        if (
          compareS_F(gatePrice_S, bybitPrice_F) >= percent &&
          compareS_F(gatePrice_S, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- GATE_SPOT VA BYBIT_FUTURE (chênh lệch: ${compareS_F(gatePrice_S, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nGATE_SPOT 🔹 BYBIT_FUTURE:  ${compareS_F(
            gatePrice_S,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //GATE_FUTURE - BYBIT_SPOT
      if (gatePrice_F && bybitPrice_S) {
        if (
          compareS_F(bybitPrice_S, gatePrice_F) >= percent &&
          compareS_F(bybitPrice_S, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- GATE_FUTURE VA BYBIT_SPOT (chênh lệch: ${compareS_F(bybitPrice_S, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nGATE_FUTURE 🔹 BYBIT_SPOT:  ${compareS_F(
            bybitPrice_S,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // GATE_FUTURE - BYBIT_FUTURE
      if (gatePrice_F && bybitPrice_F) {
        if (
          compareF_F(gatePrice_F, bybitPrice_F) >= percent &&
          compareF_F(gatePrice_F, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- GATE_FUTURE VA BYBIT_FUTURE (chênh lệch: ${compareF_F(gatePrice_F, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nGATE_FUTURE 🔹 BYBIT_FUTURE:  ${compareF_F(
            gatePrice_F,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //GATE_SPOT - BITGET_FUTURE
      if (gatePrice_S && bitgetPrice_F) {
        if (
          compareS_F(gatePrice_S, bitgetPrice_F) >= percent &&
          compareS_F(gatePrice_S, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- GATE_SPOT VA BITGET_FUTURE (chênh lệch: ${compareS_F(gatePrice_S, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nGATE_SPOT 🔹 BITGET_FUTURE:  ${compareS_F(
            gatePrice_S,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //GATE_FUTURE - BITGET_SPOT
      if (gatePrice_F && bitgetPrice_S) {
        if (
          compareS_F(bitgetPrice_S, gatePrice_F) >= percent &&
          compareS_F(bitgetPrice_S, gatePrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- GATE_FUTURE VA BITGET_SPOT (chênh lệch: ${compareS_F(bitgetPrice_S, gatePrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nGATE_FUTURE 🔹 BITGET_SPOT:  ${compareS_F(
            bitgetPrice_S,
            gatePrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // GATE_FUTURE - BITGET_FUTURE
      if (gatePrice_F && bitgetPrice_F) {
        if (
          compareF_F(gatePrice_F, bitgetPrice_F) >= percent &&
          compareF_F(gatePrice_F, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- GATE_FUTURE VA BITGET_FUTURE (chênh lệch: ${compareF_F(gatePrice_F, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nGATE_FUTURE 🔹 BITGET_FUTURE:  ${compareF_F(
            gatePrice_F,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      //BYBIT_SPOT - BITGET_FUTURE
      if (bybitPrice_S && bitgetPrice_F) {
        if (
          compareS_F(bybitPrice_S, bitgetPrice_F) >= percent &&
          compareS_F(bybitPrice_S, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BYBIT_SPOT VA BITGET_FUTURE (chênh lệch: ${compareS_F(bybitPrice_S, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBYBIT_SPOT 🔹 BITGET_FUTURE:  ${compareS_F(
            bybitPrice_S,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      //BYBIT_FUTURE - BITGET_SPOT
      if (bybitPrice_F && bitgetPrice_S) {
        if (
          compareS_F(bitgetPrice_S, bybitPrice_F) >= percent &&
          compareS_F(bitgetPrice_S, bybitPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BYBIT_FUTURE VA BITGET_SPOT (chênh lệch: ${compareS_F(bitgetPrice_S, bybitPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBYBIT_FUTURE 🔹 BITGET_SPOT:  ${compareS_F(
            bitgetPrice_S,
            bybitPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }

      // BYBIT_FUTURE - BITGET_FUTURE
      if (bybitPrice_F && bitgetPrice_F) {
        if (
          compareF_F(bybitPrice_F, bitgetPrice_F) >= percent &&
          compareF_F(bybitPrice_F, bitgetPrice_F) <= percent1
        ) {
          //console.log(`-- ${symbol} -- BYBIT_FUTURE VA BITGET_FUTURE (chênh lệch: ${compareF_F(bybitPrice_F, bitgetPrice_F).toFixed(2)}%).\n`);
          const message = `🔥${symbol}🔥\nBYBIT_FUTURE 🔹 BITGET_FUTURE:  ${compareF_F(
            bybitPrice_F,
            bitgetPrice_F
          ).toFixed(1)}%`;
          sendTelegramMessage(message);
        }
      }
      //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error.message);
    if (error.response) {
      console.error("Chi tiết lỗi:", error.response.data);
    }
  }
}

setInterval(fetchPrices, 30000);
// Chạy chương trình
fetchPrices();
