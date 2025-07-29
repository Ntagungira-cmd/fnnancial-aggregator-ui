let currentUser = null;
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || [];
let alerts = JSON.parse(localStorage.getItem('alerts')) || [];
let historicalChart = null;
let stockHistoricalChart = null;
let budgetChart = null;



const API_BASE_URL = 'http://91.223.236.51:80';
// const API_BASE_URL = 'http://localhost:80';
document.addEventListener('DOMContentLoaded', function ()
{
  initializeApp();
  loadDashboardData();
  setupEventListeners();
});
function initializeApp()
{
  // Check if user is logged in
  const token = localStorage.getItem('authToken');
  if (token)
  {
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    updateAuthUI();
  }
  // Set default dates for budget form
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  document.getElementById('budgetStartDate').value = today.toISOString().split('T')[0];
  document.getElementById('budgetEndDate').value = nextMonth.toISOString().split('T')[0];
}
function setupEventListeners()
{
  // Form submissions
  document.getElementById('currencyConverterForm').addEventListener('submit', handleCurrencyConversion);
  document.getElementById('budgetForm').addEventListener('submit', handleBudgetCreation);
  document.getElementById('alertForm').addEventListener('submit', handleAlertCreation);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('watchlistForm').addEventListener('submit', handleWatchlistAdd);
  // Real-time validation
  document.getElementById('amount').addEventListener('input', validateAmount);
  document.getElementById('budgetAmount').addEventListener('input', validateBudgetAmount);
  document.getElementById('alertValue').addEventListener('input', validateAlertValue);
  document.getElementById('stockSymbol').addEventListener('input', function (e)
  {
    e.target.value = e.target.value.toUpperCase();
  });
}
// Navigation functions
function showSection(sectionId)
{
  // Hide all sections
  document.querySelectorAll('.section').forEach(section =>
  {
    section.classList.remove('active');
  });
  // Show selected section
  document.getElementById(sectionId).classList.add('active');
  // Update navigation
  document.querySelectorAll('.nav-links a').forEach(link =>
  {
    link.classList.remove('active');
  });
  event.target.classList.add('active');
  // Load section-specific data
  switch (sectionId)
  {
    case 'currency':
      loadExchangeRates();
      break;
    case 'stocks':
      loadTrendingStocks();
      break;
    case 'budget':
      loadBudgetSummary();
      loadBudgetList();
      break;
    case 'alerts':
      loadAlertsList();
      break;
  }
}
function toggleMobileMenu()
{
  document.getElementById('navLinks').classList.toggle('active');
}
// Modal functions
function showModal(modalId)
{
  document.getElementById(modalId).classList.add('active');
}
function hideModal(modalId)
{
  document.getElementById(modalId).classList.remove('active');
}
// Authentication functions
async function handleLogin(e)
{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  // Validate inputs
  if (!validateEmail(email))
  {
    showError('loginEmailError', 'Please enter a valid email address');
    return;
  }
  if (password.length < 6)
  {
    showError('loginPasswordError', 'Password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Store token and user data
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('currentUser', JSON.stringify({ email, name: data.user.name }));
      currentUser = { email, name: data.user.name };
      updateAuthUI();
      hideModal('loginModal');
      showAlert('Login successful!', 'success');
      loadDashboardData();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Login failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

async function handleRegister(e)
{
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  // Validate inputs
  if (name.length < 2)
  {
    showError('registerNameError', 'Name must be at least 2 characters');
    return;
  }
  if (!validateEmail(email))
  {
    showError('registerEmailError', 'Please enter a valid email address');
    return;
  }
  if (password.length < 6)
  {
    showError('registerPasswordError', 'Password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Store token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify({ email, name }));
      currentUser = { email, name };
      updateAuthUI();
      hideModal('registerModal');
      showAlert('Registration successful!', 'success');
      loadDashboardData();
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Registration failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

function logout()
{
  currentUser = JSON.parse(localStorage.getItem('currentUser'));
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  updateAuthUI();
  showAlert('Logged out successfully!', 'success');
  window.location.reload();
}

function updateAuthUI()
{
  const authButtons = document.getElementById('authButtons');
  if (currentUser)
  {
    authButtons.innerHTML = `
                <span>Welcome, ${currentUser.name}</span>
                <button class="btn btn-secondary" onclick="logout()">Logout</button>
            `;
  } else
  {
    authButtons.innerHTML = `
                <button class="btn btn-secondary" onclick="showModal('loginModal')">Login</button>
                <button class="btn btn-primary" onclick="showModal('registerModal')">Register</button>
            `;
  }
}

// Currency functions
async function handleCurrencyConversion(e)
{
  e.preventDefault();
  const from = document.getElementById('fromCurrency').value;
  const to = document.getElementById('toCurrency').value;
  const amount = parseFloat(document.getElementById('amount').value);
  
  if (!from || !to || !amount)
  {
    showAlert('Please fill in all fields', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/currency/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        from,
        to,
        amount
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('conversionResult').innerHTML = `
                <div class="alert alert-success">
                    <strong>${amount} ${from} = ${data.data.convertedAmount} ${to}</strong><br>
                    Exchange Rate: 1 ${from} = ${data.data.rate} ${to}
                </div>
            `;
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Conversion failed', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

async function loadExchangeRates()
{
  const baseCurrency = document.getElementById('baseCurrency').value;
  const container = document.getElementById('exchangeRates');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/currency/rates?base=${baseCurrency}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const rates = Object.entries(data.data.rates).map(([currency, rate]) => ({
        currency,
        rate: rate.toFixed(4),
        change: (Math.random() * 4 - 2).toFixed(2)
      }));
      
      container.innerHTML = rates.map(rate => `
                <div class="flex justify-between items-center" style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                    <span><strong>${rate.currency}</strong></span>
                    <span>${rate.rate}</span>
                    <span class="stat-change ${rate.change > 0 ? 'positive' : 'negative'}">
                        ${rate.change > 0 ? '+' : ''}${rate.change}%
                    </span>
                </div>
            `).join('');
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message || 'Failed to load exchange rates'}</div>`;
    }
  } catch (error) {
    console.log(error);
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function loadHistoricalRates() {
  const base = document.getElementById('historyBaseCurrency').value;
  const target = document.getElementById('historyTargetCurrency').value;
  const days = parseInt(document.getElementById('historyDays').value);

  if (base === target) {
    showAlert('Base and target currencies cannot be the same', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/currency/rates/${base}/${target}/history?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const labels = data.data.rates.map(rate => new Date(rate.timestamp).toLocaleDateString());
      const values = data.data.rates.map(rate => rate.rate);

      const ctx = document.getElementById('historicalChart').getContext('2d');

      if (historicalChart) {
        historicalChart.destroy();
      }

      historicalChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: `${base}/${target}`,
            data: values,
            borderColor: 'rgb(37, 99, 235)',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });

    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load historical rates', 'error');
    }
  } catch (error) {
    console.error(error);
    showAlert('Network error. Please try again.', 'error');
  }
}

// Stock functions
async function searchStocks()
{
  const query = document.getElementById('stockSearch').value.trim();
  if (!query)
  {
    showAlert('Please enter a search term', 'error');
    return;
  }
  const container = document.getElementById('stockSearchResults');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/stock/search/${query}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      container.innerHTML = `
                <div class="table-container mt-2">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Region</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.data.map(stock => `
                                <tr>
                                    <td><strong>${stock.symbol}</strong></td>
                                    <td>${stock.name}</td>
                                    <td>${stock.type}</td>
                                    <td>${stock.region}</td>
                                    <td>
                                        <button class="btn btn-primary" onclick="addToWatchlist('${stock.symbol}')">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message || 'Failed to search stocks'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function getStockQuote()
{
  const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
  if (!symbol)
  {
    showAlert('Please enter a stock symbol', 'error');
    return;
  }
  const container = document.getElementById('stockQuoteResult');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/stock/quote/${symbol}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const quote = data.data;
      container.innerHTML = `
                <div class="alert alert-success">
                    <h4>${quote.symbol}</h4>
                    <div class="grid grid-2" style="gap: 1rem; margin-top: 1rem;">
                        <div><strong>Price:</strong> $${quote.price}</div>
                        <div><strong>Change:</strong> <span class="stat-change ${quote.change > 0 ? 'positive' : 'negative'}">${quote.change > 0 ? '+' : ''}${quote.change} (${quote.changePercent})</span></div>
                        <div><strong>Open:</strong> $${quote.open}</div>
                        <div><strong>High:</strong> $${quote.high}</div>
                        <div><strong>Low:</strong> $${quote.low}</div>
                        <div><strong>Volume:</strong> ${quote.volume.toLocaleString()}</div>
                    </div>
                </div>
            `;
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message || 'Failed to get stock quote'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function loadTrendingStocks()
{
  const container = document.getElementById('trendingStocks');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/stock/trending`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      container.innerHTML = data.data.map(stock => `
                <div class="flex justify-between items-center" style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${stock.symbol}</strong><br>
                        <small style="color: var(--text-secondary);">$${stock.price}</small>
                    </div>
                    <span class="stat-change ${stock.change > 0 ? 'positive' : 'negative'}">
                        ${stock.change > 0 ? '+' : ''}${stock.changePercent}
                    </span>
                </div>
            `).join('');
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message || 'Failed to load trending stocks'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function loadMarketIndices()
{
  const container = document.getElementById('marketIndices');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/stock/market-indices`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const indices = data.data;
      container.innerHTML = Object.entries(indices).map(([key, index]) => `
                <div class="flex justify-between items-center" style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${index.symbol}</strong><br>
                        <small style="color: var(--text-secondary);">${index.price.toLocaleString()}</small>
                    </div>
                    <span class="stat-change ${index.change > 0 ? 'positive' : 'negative'}">
                        ${index.change > 0 ? '+' : ''}${index.changePercent}
                    </span>
                </div>
            `).join('');
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message || 'Failed to load market indices'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function loadStockHistoricalData()
{
  const symbol = document.getElementById('historicalStockSymbol').value.trim().toUpperCase();
  const days = parseInt(document.getElementById('historicalStockDays').value);

  if (!symbol)
  {
    showAlert('Please enter a stock symbol', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/stock/historical/${symbol}?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(data);
      const labels = data.data.map(item => new Date(item.timestamp).toLocaleDateString());
      const values = data.data.map(item => item.price);
      
      // Create chart
      const ctx = document.getElementById('stockHistoricalChart').getContext('2d');

      if (stockHistoricalChart) {
        stockHistoricalChart.destroy();
      }

      stockHistoricalChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: `${symbol} Price`,
            data: values,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to load historical data', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

// Watchlist functions
async function handleWatchlistAdd(e)
{
  e.preventDefault();
  const symbol = document.getElementById('watchlistSymbol').value.trim().toUpperCase();
  addToWatchlist(symbol);
  hideModal('addWatchlistModal');
}

async function addToWatchlist(symbol)
{
  if (!symbol)
  {
    showAlert('Please enter a stock symbol', 'error');
    return;
  }
  if (watchlist.includes(symbol))
  {
    showAlert('Stock already in watchlist', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ symbol })
    });
    
    if (response.ok) {
      watchlist.push(symbol);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      updateWatchlistDisplay();
      showAlert(`${symbol} added to watchlist`, 'success');
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to add to watchlist', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

async function removeFromWatchlist(symbol)
{
  try {
    const response = await fetch(`${API_BASE_URL}/watchlist/${symbol}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      watchlist = watchlist.filter(s => s !== symbol);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      updateWatchlistDisplay();
      showAlert(`${symbol} removed from watchlist`, 'success');
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to remove from watchlist', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

function updateWatchlistDisplay()
{
  const container = document.getElementById('watchlist');
  if (watchlist.length === 0)
  {
    container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No stocks in watchlist</p>';
    return;
  }
  
  // For each symbol in watchlist, fetch its quote
  const promises = watchlist.map(async (symbol) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stock/quote/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { ...data.data, symbol };
      } else {
        return { symbol, price: 'N/A', change: 0, changePercent: 'N/A' };
      }
    } catch (error) {
      return { symbol, price: 'N/A', change: 0, changePercent: 'N/A' };
    }
  });
  
  // Update display once all quotes are fetched
  Promise.all(promises).then(quotes => {
    container.innerHTML = quotes.map(quote => `
                <div class="flex justify-between items-center" style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${quote.symbol}</strong><br>
                        <small style="color: var(--text-secondary);">$${quote.price}</small>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="stat-change ${quote.change > 0 ? 'positive' : 'negative'}">
                            ${quote.change > 0 ? '+' : ''}${quote.changePercent}
                        </span>
                        <button class="btn btn-danger" onclick="removeFromWatchlist('${quote.symbol}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `).join('');
  });
}

// Budget functions
async function handleBudgetCreation(e)
{
  e.preventDefault();
  const name = document.getElementById('budgetName').value;
  const amount = parseFloat(document.getElementById('budgetAmount').value);
  const currency = document.getElementById('budgetCurrency').value;
  const categories = Array.from(document.querySelectorAll('#budgetForm input[type="checkbox"]:checked')).map(cb => cb.value);
  const period = document.getElementById('budgetPeriod').value;
  const startDate = document.getElementById('budgetStartDate').value;
  const endDate = document.getElementById('budgetEndDate').value;
  
  // Validate inputs
  if (!name || !amount || !currency || categories.length === 0 || !period || !startDate || !endDate)
  {
    showAlert('Please fill in all fields', 'error');
    return;
  }
  if (new Date(startDate) >= new Date(endDate))
  {
    showAlert('End date must be after start date', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        name,
        amount,
        currency,
        categories,
        period,
        startDate,
        endDate
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Reset form
      document.getElementById('budgetForm').reset();
      loadBudgetList();
      loadBudgetSummary();
      showAlert('Budget created successfully!', 'success');
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to create budget', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

async function loadBudgetList()
{
  const container = document.getElementById('budgetList');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/budget`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      budgets = data; // Update local budgets array
      
      if (budgets.length === 0)
      {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No budgets created yet</p>';
        return;
      }
      
      container.innerHTML = budgets.map(budget => `
                <div class="card" style="margin-bottom: 1rem; padding: 1rem;">
                    <div class="flex justify-between items-center mb-1">
                        <h4>${budget.name}</h4>
                        <button class="btn btn-danger" onclick="deleteBudget('${budget.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="grid grid-2" style="gap: 0.5rem; font-size: 0.875rem;">
                        <div><strong>Amount:</strong> ${budget.amount} ${budget.currency}</div>
                        <div><strong>Period:</strong> ${budget.period}</div>
                        <div><strong>Categories:</strong> ${budget.categories.join(', ')}</div>
                        <div><strong>Duration:</strong> ${new Date(budget.startDate).toLocaleDateString()} - ${new Date(budget.endDate).toLocaleDateString()}</div>
                    </div>
                </div>
            `).join('');
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message === 'Invalid token'
        ? 'Your session has expired. Please log in to access this feature.'
        : 'Failed to load budgets'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function loadBudgetSummary()
{
  const currency = document.getElementById('budgetSummaryCurrency').value;
  const container = document.getElementById('budgetSummary');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/budget/summary?currency=${currency}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${data.total.toFixed(2)} ${data.baseCurrency}</div>
                        <div class="stat-label">Total Budget</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.budgets.length}</div>
                        <div class="stat-label">Active Budgets</div>
                    </div>
                </div>
            `;
      
      // Update dashboard stat
      document.getElementById('totalBudgets').textContent = `$${data.total.toFixed(0)}`;
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message === 'Invalid token'
        ? 'Your session has expired. Please log in to access this feature.'
        : 'Failed to load budget summary'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function deleteBudget(id)
{
  if (confirm('Are you sure you want to delete this budget?'))
  {
    try {
      const response = await fetch(`${API_BASE_URL}/budget/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        budgets = budgets.filter(budget => budget.id !== id);
        loadBudgetList();
        loadBudgetSummary();
        showAlert('Budget deleted successfully!', 'success');
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to delete budget', 'error');
      }
    } catch (error) {
      showAlert('Network error. Please try again.', 'error');
    }
  }
}

// Alert functions
async function handleAlertCreation(e)
{
  e.preventDefault();
  const type = document.getElementById('alertType').value;
  const target = document.getElementById('alertTarget').value.trim();
  const condition = document.getElementById('alertCondition').value;
  const value = parseFloat(document.getElementById('alertValue').value);
  const email = document.getElementById('alertEmail').value.trim();
  
  // Validate inputs
  if (!type || !target || !condition || !value || !email)
  {
    showAlert('Please fill in all fields', 'error');
    return;
  }
  if (!validateEmail(email))
  {
    showError('alertEmailError', 'Please enter a valid email address');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        type,
        target: target.toUpperCase(),
        condition,
        value,
        notificationEmail: email
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      // Reset form
      document.getElementById('alertForm').reset();
      loadAlertsList();
      updateActiveAlertsCount();
      showAlert('Alert created successfully!', 'success');
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to create alert', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

async function loadAlertsList()
{
  const container = document.getElementById('alertsList');
  container.innerHTML = '<div class="loading"></div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/alert`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      alerts = data; // Update local alerts array
      
      if (alerts.length === 0)
      {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No alerts created yet</p>';
        return;
      }

      container.innerHTML = alerts.map(alert => `
                <div class="card" style="margin-bottom: 1rem; padding: 1rem;">
                    <div class="flex justify-between items-center mb-1">
                        <div>
                            <h4>${alert.target}</h4>
                            <small style="color: var(--text-secondary);">${alert.type} alert</small>
                        </div>
                        <div class="flex items-center gap-1">
                            <button class="btn ${alert.isActive ? 'btn-success' : 'btn-secondary'}" onclick="toggleAlert('${alert.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                <i class="fas fa-${alert.isActive ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn btn-danger" onclick="deleteAlert('${alert.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.875rem;">
                        <strong>Condition:</strong> ${alert.condition} ${alert.value}<br>
                        <strong>Email:</strong> ${alert.notificationEmail}<br>
                        <strong>Status:</strong> <span class="${alert.isActive ? 'stat-change positive' : 'stat-change negative'}">${alert.isActive ? 'Active' : 'Paused'}</span>
                    </div>
                </div>
            `).join('');
    } else {
      const errorData = await response.json();
      container.innerHTML = `<div class="alert alert-error">${errorData.message === 'Invalid token'
        ? 'Your session has expired. Please log in to access this feature.'
        : 'Failed to load alerts'}</div>`;
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Network error. Please try again.</div>`;
  }
}

async function toggleAlert(id)
{
  try {
    const response = await fetch(`${API_BASE_URL}/alert/${id}/toggle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const alert = alerts.find(a => a.id === id);
      if (alert) {
        alert.isActive = data.isActive;
      }
      loadAlertsList();
      updateActiveAlertsCount();
      showAlert(`Alert ${data.isActive ? 'activated' : 'paused'}`, 'success');
    } else {
      const errorData = await response.json();
      showAlert(errorData.message || 'Failed to toggle alert', 'error');
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
  }
}

async function deleteAlert(id)
{
  if (confirm('Are you sure you want to delete this alert?'))
  {
    try {
      const response = await fetch(`${API_BASE_URL}/alert/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        alerts = alerts.filter(alert => alert.id !== id);
        loadAlertsList();
        updateActiveAlertsCount();
        showAlert('Alert deleted successfully!', 'success');
      } else {
        const errorData = await response.json();
        showAlert(errorData.message || 'Failed to delete alert', 'error');
      }
    } catch (error) {
      showAlert('Network error. Please try again.', 'error');
    }
  }
}

function updateActiveAlertsCount()
{
  const activeCount = alerts.filter(alert => alert.active).length;
  document.getElementById('activeAlerts').textContent = activeCount;
}

function updateAlertTargetOptions()
{
  const type = document.getElementById('alertType').value;
  const targetInput = document.getElementById('alertTarget');
  if (type === 'stock')
  {
    targetInput.placeholder = 'e.g., AAPL, GOOGL';
  } else if (type === 'currency')
  {
    targetInput.placeholder = 'e.g., USD/EUR, GBP/USD';
  } else
  {
    targetInput.placeholder = '';
  }
}

// Validation functions
function validateEmail(email)
{
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateAmount()
{
  const amount = parseFloat(document.getElementById('amount').value);
  const errorElement = document.getElementById('amountError');
  if (amount <= 0)
  {
    showError('amountError', 'Amount must be greater than 0');
    return false;
  }
  clearError('amountError');
  return true;
}

function validateBudgetAmount()
{
  const amount = parseFloat(document.getElementById('budgetAmount').value);
  if (amount <= 0)
  {
    showError('budgetAmountError', 'Amount must be greater than 0');
    return false;
  }
  clearError('budgetAmountError');
  return true;
}

function validateAlertValue()
{
  const value = parseFloat(document.getElementById('alertValue').value);
  if (value <= 0)
  {
    showError('alertValueError', 'Value must be greater than 0');
    return false;
  }
  clearError('alertValueError');
  return true;
}

function showError(elementId, message)
{
  const errorElement = document.getElementById(elementId);
  const inputElement = errorElement.previousElementSibling;
  errorElement.textContent = message;
  inputElement.classList.add('error');
}

function clearError(elementId)
{
  const errorElement = document.getElementById(elementId);
  const inputElement = errorElement.previousElementSibling;
  errorElement.textContent = '';
  inputElement.classList.remove('error');
}

// Utility functions
function showAlert(message, type = 'success')
{
  // Create alert element
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  // Insert at top of main content
  const main = document.querySelector('.main .container');
  main.insertBefore(alertDiv, main.firstChild);
  // Remove after 3 seconds
  setTimeout(() =>
  {
    alertDiv.remove();
  }, 3000);
}

function loadDashboardData()
{
  loadMarketIndices();
  loadTrendingStocks();
  updateActiveAlertsCount();
  loadBudgetSummary();
  updateWatchlistDisplay();
  createPortfolioChart();
}

function createPortfolioChart()
{
  const ctx = document.getElementById('portfolioChart').getContext('2d');
  const data = generateMockPortfolioData();
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Portfolio Value',
        data: data.values,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function (value)
            {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

function generateMockPortfolioData()
{
  const labels = [];
  const values = [];
  const baseValue = 10000;
  for (let i = 30; i >= 0; i--)
  {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString());
    values.push(Math.floor(baseValue + (Math.random() - 0.3) * 2000));
  }
  return { labels, values };
}

function createBudgetChart()
{
  const ctx = document.getElementById('budgetChart').getContext('2d');
  if (budgets.length === 0)
  {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('No budget data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  const categories = {};
  budgets.forEach(budget =>
  {
    budget.categories.forEach(category =>
    {
      categories[category] = (categories[category] || 0) + budget.amount;
    });
  });

  if (budgetChart)
  {
    budgetChart.destroy();
  }

  budgetChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function updateBudgetChart()
{
  createBudgetChart();
}

document.addEventListener('DOMContentLoaded', function ()
{
  // Observer to update budget chart when section becomes visible
  const budgetSection = document.getElementById('budget');
  const observer = new MutationObserver(function (mutations)
  {
    mutations.forEach(function (mutation)
    {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class')
      {
        if (budgetSection.classList.contains('active'))
        {
          setTimeout(createBudgetChart, 100);
        }
      }
    });
  });
  observer.observe(budgetSection, { attributes: true });
});