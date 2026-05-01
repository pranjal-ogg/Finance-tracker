let ratesCache = {};
const TTL = 60 * 60 * 1000; // 1 hour in ms

exports.fetchExchangeRates = async (baseCurrency = 'INR') => {
  const now = Date.now();
  
  if (ratesCache[baseCurrency] && (now - ratesCache[baseCurrency].timestamp < TTL)) {
    return ratesCache[baseCurrency].rates;
  }

  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (!response.ok) throw new Error('API fetch failed');
    const data = await response.json();
    
    ratesCache[baseCurrency] = {
      timestamp: now,
      rates: data.rates
    };
    return data.rates;
  } catch (err) {
    console.warn(`[WARN] Failed to fetch exchange rates for ${baseCurrency}. Falling back to 1:1 rates. Error: ${err.message}`);
    return null; // Signals fallback to caller
  }
};

exports.convertAmount = (amount, fromCurrency, toCurrency, rates) => {
  if (fromCurrency === toCurrency) return parseFloat(amount);
  
  // If we don't have rates (API failed or unavailable), fallback strictly to 1:1
  if (!rates || !rates[fromCurrency]) return parseFloat(amount);

  // Exchangerate-api returns rates where 1 BaseCurrency = X fromCurrency
  // To convert back to base currency, divide by the rate
  return parseFloat(amount) / rates[fromCurrency];
};
