import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { 
  WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, 
  WiFog, WiThermometer, WiHumidity, WiStrongWind, WiBarometer,
  WiSunrise, WiSunset, WiCelsius, WiDegrees, WiMoonFull 
} from 'react-icons/wi';
import { 
  FiSearch, 
  FiMapPin, 
  FiRefreshCw, 
  FiMenu, 
  FiX,
  FiSun,
  FiMoon,
  FiHome,
  FiMap,
  FiSettings
} from 'react-icons/fi';

function App() {
  // États principaux de l'application
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('metric');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [theme, setTheme] = useState('system');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Configuration de l'API OpenWeatherMap
  const API_KEY = '7af1a4538ae3af0538c6aa916b49a849';
  const BASE_URL = 'https://api.openweathermap.org/data/2.5';

  // Fonction pour détecter et appliquer le thème du système
  /**
   * Détecte et applique le thème du système d'exploitation
   * Utilise matchMedia pour détecter les préférences de thème
   * Met à jour le thème du document et l'état local
   */
  const detectSystemTheme = () => {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? 'dark' : 'light';
  };

  // Fonction pour appliquer le thème sélectionné
  /**
   * Applique le thème sélectionné au document HTML
   * Gère trois modes : 'light', 'dark', et 'system'
   * Pour 'system', utilise detectSystemTheme() pour déterminer le thème
   * Ajoute/retire les classes CSS appropriées sur l'élément html
   */
  const applyTheme = (selectedTheme) => {
    const html = document.documentElement;
    
    // Retire les classes de thème précédentes
    html.classList.remove('light-theme', 'dark-theme');
    
    let actualTheme = selectedTheme;
    
    if (selectedTheme === 'system') {
      actualTheme = detectSystemTheme();
    }
    
    // Applique le thème actuel
    html.classList.add(`${actualTheme}-theme`);
    setTheme(selectedTheme);
    
    // Stocke la préférence dans le localStorage
    localStorage.setItem('weather-app-theme', selectedTheme);
  };

  // Fonction pour basculer entre thème clair et sombre
  /**
   * Bascule entre les thèmes clair et sombre
   * Si le thème actuel est 'system', bascule vers 'dark'
   * Gère la transition fluide entre les thèmes
   */
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  };

  // Initialisation du thème au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('weather-app-theme') || 'system';
    applyTheme(savedTheme);
  }, []);

  // Fonction pour rechercher des suggestions de villes
  /**
   * Effectue une recherche d'autocomplétion pour les villes
   * Utilise l'API OpenWeatherMap Geocoding
   * Limite les résultats à 5 suggestions maximum
   * Gère les erreurs de l'API et nettoie les suggestions en cas d'erreur
   */
  const fetchCitySuggestions = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
      );
      
      if (!response.ok) throw new Error('Erreur de suggestion');
      
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setSuggestions([]);
    }
  }, [API_KEY]);

  // Fonction pour récupérer les données météo complètes
  /**
   * Récupère les données météo actuelles et les prévisions pour une ville donnée
   * Effectue deux appels API : weather pour les conditions actuelles et forecast pour les prévisions
   * Gère les états de chargement et les erreurs
   * Transforme et filtre les données de prévision pour obtenir un format quotidien
   */
  const fetchWeather = async (cityName, showLoading = true) => {
    if (!cityName.trim()) {
      setError('Veuillez saisir le nom d\'une ville');
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    
    setError('');
    setSuggestions([]);

    try {
      // Vérification du format de la ville (peut être un nom ou "ville,pays")
      let query = cityName.trim();
      
      // Récupération des données météo actuelles
      const weatherResponse = await fetch(
        `${BASE_URL}/weather?q=${query}&units=${unit}&appid=${API_KEY}&lang=fr`
      );
      
      const weatherData = await weatherResponse.json();
      
      // Vérification de la réponse de l'API
      if (weatherData.cod !== 200) {
        throw new Error(weatherData.message || 'Ville non trouvée');
      }
      
      // Récupération des prévisions sur 5 jours
      const forecastResponse = await fetch(
        `${BASE_URL}/forecast?q=${query}&units=${unit}&appid=${API_KEY}&lang=fr`
      );
      
      if (!forecastResponse.ok) {
        throw new Error('Erreur lors de la récupération des prévisions');
      }
      
      const forecastData = await forecastResponse.json();
      
      // Filtrage pour obtenir une prévision par jour (toutes les 24h)
      const dailyForecasts = forecastData.list.filter((item, index) => index % 8 === 0).slice(0, 5);
      
      setWeatherData(weatherData);
      setForecastData(dailyForecasts);
      setLoading(false);
      setInitialLoad(false);
    } catch (err) {
      // Messages d'erreur plus clairs
      const errorMessages = {
        'city not found': 'Ville non trouvée. Vérifiez l\'orthographe.',
        'nothing to geocode': 'Veuillez saisir un nom de ville.',
        'invalid api key': 'Erreur de configuration API. Contactez l\'administrateur.',
        '404': 'Service temporairement indisponible. Veuillez réessayer plus tard.',
        '429': 'Limite d\'appels API atteinte. Veuillez patienter quelques instants.',
        '500': 'Erreur serveur. Veuillez réessayer plus tard.',
        '502': 'Service temporairement indisponible.',
        '503': 'Service en maintenance.',
        '504': 'Délai d\'attente dépassé. Vérifiez votre connexion.'
      };
      
      const errorKey = err.message.toLowerCase();
      const userMessage = errorMessages[errorKey] || 
                         (err.message.includes('Failed to fetch') ? 
                          'Erreur de connexion. Vérifiez votre internet.' : 
                          `Erreur: ${err.message}`);
      
      setError(userMessage);
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Fonction pour obtenir l'icône météo appropriée
  /**
   * Retourne un composant d'icône basé sur l'ID de condition météo
   * Utilise les codes d'ID standard de l'API OpenWeatherMap
   * Groupe les conditions météo par plages d'ID (orage, pluie, neige, etc.)
   */
  const getWeatherIcon = (condition) => {
    if (!condition) return <WiDaySunny className="text-yellow-500" />;
    
    const id = parseInt(condition);
    if (isNaN(id)) return <WiDaySunny className="text-yellow-500" />;
    
    if (id >= 200 && id < 300) return <WiThunderstorm className="text-yellow-500" />;
    if (id >= 300 && id < 400) return <WiRain className="text-blue-400" />;
    if (id >= 500 && id < 600) return <WiRain className="text-blue-500" />;
    if (id >= 600 && id < 700) return <WiSnow className="text-blue-300" />;
    if (id >= 700 && id < 800) return <WiFog className="text-gray-400" />;
    if (id === 800) return <WiDaySunny className="text-yellow-500" />;
    if (id > 800 && id < 900) return <WiCloudy className="text-gray-500" />;
    
    return <WiDaySunny className="text-yellow-500" />;
  };

  // Fonctions de formatage
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Gestionnaire de recherche
  const handleSearch = (e) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeather(city);
    } else {
      setError('Veuillez saisir le nom d\'une ville');
    }
  };

  // Gestionnaire de changement d'input avec debounce
  const handleInputChange = (value) => {
    setCity(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      if (value.length >= 2) {
        fetchCitySuggestions(value);
      } else {
        setSuggestions([]);
      }
    }, 300);
  };

  // Sélection d'une suggestion
  const handleSuggestionClick = (suggestion) => {
    const cityName = `${suggestion.name}, ${suggestion.country}`;
    setCity(cityName);
    setSuggestions([]);
    fetchWeather(cityName);
  };

  // Fonction pour obtenir la météo par géolocalisation
  /**
   * Récupère la météo pour la position actuelle de l'utilisateur
   * Utilise l'API Geolocation du navigateur
   * Convertit les coordonnées en données météo via l'API OpenWeatherMap
   * Gère les permissions et les erreurs de géolocalisation
   */
  const getCurrentLocationWeather = () => {
    if (navigator.geolocation) {
      setLoading(true);
      setError('');
      setSuggestions([]);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=${unit}&appid=${API_KEY}&lang=fr`
            );
            
            const data = await response.json();
            
            if (data.cod !== 200) {
              throw new Error(data.message || 'Erreur de géolocalisation');
            }
            
            setWeatherData(data);
            setCity(`${data.name}, ${data.sys.country}`);
            setLoading(false);
            setInitialLoad(false);
            
            // Fetch forecast for current location
            const forecastResponse = await fetch(
              `${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&units=${unit}&appid=${API_KEY}&lang=fr`
            );
            
            if (forecastResponse.ok) {
              const forecastData = await forecastResponse.json();
              const dailyForecasts = forecastData.list.filter((item, index) => index % 8 === 0).slice(0, 5);
              setForecastData(dailyForecasts);
            }
          } catch (err) {
            setError('Erreur lors de la géolocalisation: ' + err.message);
            setLoading(false);
          }
        },
        (error) => {
          const errorMessages = {
            1: 'Géolocalisation refusée. Veuillez autoriser l\'accès à votre position.',
            2: 'Position indisponible. Vérifiez votre connexion réseau.',
            3: 'Délai de géolocalisation expiré.'
          };
          setError(errorMessages[error.code] || 'Erreur de géolocalisation.');
          setLoading(false);
        },
        { 
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 30000
        }
      );
    } else {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
    }
  };

  // Fermeture des suggestions en cliquant à l'extérieur
  useEffect(() => {
    let isMounted = true;

    const handleClickOutside = (event) => {
      if (!isMounted) return;
      
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Effet pour changer d'unité
  useEffect(() => {
    if (city.trim() && weatherData) {
      fetchWeather(city, false);
    }
  }, [unit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation Bar */}
        <nav className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-8 transition-colors duration-300">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo et nom de l'application */}
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-xl">
                  <WiDaySunny className="text-white text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Ujuvi_Brain
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Intelligence météorologique avancée
                  </p>
                </div>
              </div>

              {/* Menu Desktop */}
              <div className="hidden md:flex items-center space-x-6">
                <button 
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors"
                  onClick={() => setCity('')}
                >
                  <FiHome />
                  <span>Accueil</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors">
                  <FiMap />
                  <span>Carte</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors">
                  <FiSettings />
                  <span>Paramètres</span>
                </button>

                {/* Bouton unique pour basculer le thème */}
                <button
                  onClick={toggleTheme}
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                  title={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
                >
                  {theme === 'dark' ? (
                    <FiSun className="text-yellow-500" />
                  ) : (
                    <FiMoon className="text-blue-500" />
                  )}
                </button>
              </div>

              {/* Menu Mobile Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-gray-700 dark:text-gray-300"
              >
                {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>

            {/* Menu Mobile */}
            {isMenuOpen && (
              <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col space-y-3">
                  <button 
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors py-2"
                    onClick={() => {
                      setCity('');
                      setIsMenuOpen(false);
                    }}
                  >
                    <FiHome />
                    <span>Accueil</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors py-2">
                    <FiMap />
                    <span>Carte</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors py-2">
                    <FiSettings />
                    <span>Paramètres</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors py-2"
                  >
                    {theme === 'dark' ? (
                      <>
                        <FiSun />
                        <span>Thème clair</span>
                      </>
                    ) : (
                      <>
                        <FiMoon />
                        <span>Thème sombre</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2">
            {/* Barre de recherche avec suggestions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 transition-colors duration-300">
              <form onSubmit={handleSearch} className="relative">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow relative" ref={suggestionsRef}>
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Rechercher une ville (ex: Paris, FR ou New York, US)..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
                    />
                    
                    {/* Suggestions de villes */}
                    {suggestions.length > 0 && (
                      <div 
                        className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {suggestions.map((suggestion) => (
                          <div
                            key={`${suggestion.name}-${suggestion.country}-${suggestion.lat || 0}-${suggestion.lon || 0}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionClick(suggestion);
                            }}
                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-800 dark:text-white">
                              {suggestion.name}, {suggestion.country}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {suggestion.state ? `${suggestion.state}, ${suggestion.country}` : suggestion.country}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2 flex-1 md:flex-none"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FiSearch /> Rechercher
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={getCurrentLocationWeather}
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      title="Utiliser ma position actuelle"
                      disabled={loading}
                    >
                      <FiMapPin />
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchWeather(city)}
                      className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      title="Actualiser"
                      disabled={loading || !city.trim()}
                    >
                      <FiRefreshCw />
                    </button>
                  </div>
                </div>

                {/* Sélecteur d'unités et conseils de recherche */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600 dark:text-gray-400">Unités :</span>
                    <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                      <button
                        onClick={() => setUnit('metric')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${unit === 'metric' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-cyan-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        disabled={loading}
                      >
                        °C
                      </button>
                      <button
                        onClick={() => setUnit('imperial')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${unit === 'imperial' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-cyan-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        disabled={loading}
                      >
                        °F
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 md:mt-0">
                    💡 Conseil : Utilisez "Ville, Code Pays" pour plus de précision
                  </div>
                </div>
              </form>
            </div>

            {/* Affichage principal - État initial */}
            {initialLoad ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center transition-colors duration-300">
                <div className="text-5xl mb-4">🌤️</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Bienvenue sur Ujuvi_Brain Weather
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Recherchez une ville pour obtenir les prévisions météo
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button 
                    onClick={() => {
                      setCity('Paris, FR');
                      fetchWeather('Paris, FR');
                    }}
                    className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                  >
                    Paris, FR
                  </button>
                  <button 
                    onClick={() => {
                      setCity('London, GB');
                      fetchWeather('London, GB');
                    }}
                    className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                  >
                    London, GB
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center transition-colors duration-300">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-cyan-500 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Chargement des données météo...</p>
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center transition-colors duration-300">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Erreur de recherche</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => fetchWeather('Paris, FR')}
                    className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    Essayer Paris, FR
                  </button>
                  <button 
                    onClick={() => fetchWeather('London, GB')}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Essayer London, GB
                  </button>
                  <button 
                    onClick={getCurrentLocationWeather}
                    className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                  >
                    Ma position
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Format recommandé : "Ville, Code Pays" (ex: "Madrid, ES" ou "Tokyo, JP")
                </p>
              </div>
            ) : weatherData && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 transition-colors duration-300">
                {/* En-tête localisation et date */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <FiMapPin className="text-blue-500 dark:text-cyan-400" />
                      {weatherData.name}, {weatherData.sys?.country}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {formatDate(weatherData.dt)}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Dernière mise à jour: {new Date((weatherData.dt || 0) * 1000).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 text-right">
                    <div className="text-4xl font-bold text-gray-800 dark:text-white flex items-center justify-end">
                      {Math.round(weatherData.main?.temp)}°{unit === 'metric' ? 'C' : 'F'}
                      <WiCelsius className="ml-1 text-gray-600 dark:text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 capitalize">
                      {weatherData.weather?.[0]?.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Ressenti: {Math.round(weatherData.main?.feels_like)}°
                    </p>
                  </div>
                </div>

                {/* Conditions météo principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-4 flex flex-col items-center justify-center">
                    <div className="text-5xl mb-2">
                      {getWeatherIcon(weatherData.weather?.[0]?.id)}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium text-center">
                      {weatherData.weather?.[0]?.main}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-2xl p-4">
                    <div className="flex items-center justify-center mb-2">
                      <WiThermometer className="text-3xl text-cyan-600 dark:text-cyan-400" />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Température</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {Math.round(weatherData.main?.temp_max)}° / {Math.round(weatherData.main?.temp_min)}°
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Max / Min</p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl p-4">
                    <div className="flex items-center justify-center mb-2">
                      <WiHumidity className="text-3xl text-green-600 dark:text-green-400" />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Humidité</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {weatherData.main?.humidity}%
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Relative</p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl p-4">
                    <div className="flex items-center justify-center mb-2">
                      <WiStrongWind className="text-3xl text-purple-600 dark:text-purple-400" />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Vent</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">
                        {Math.round(weatherData.wind?.speed)} {unit === 'metric' ? 'km/h' : 'mph'}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Vitesse</p>
                    </div>
                  </div>
                </div>

                {/* Informations supplémentaires */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center transition-colors">
                    <WiBarometer className="text-2xl text-blue-500 dark:text-cyan-400 mr-3" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Pression</p>
                      <p className="font-bold text-gray-800 dark:text-white">{weatherData.main?.pressure} hPa</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center transition-colors">
                    <WiSunrise className="text-2xl text-orange-500 dark:text-yellow-400 mr-3" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Lever du soleil</p>
                      <p className="font-bold text-gray-800 dark:text-white">{formatTime(weatherData.sys?.sunrise)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center transition-colors">
                    <WiSunset className="text-2xl text-purple-500 dark:text-purple-400 mr-3" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Coucher du soleil</p>
                      <p className="font-bold text-gray-800 dark:text-white">{formatTime(weatherData.sys?.sunset)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center transition-colors">
                    <WiDegrees className="text-2xl text-red-500 dark:text-red-400 mr-3" />
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Visibilité</p>
                      <p className="font-bold text-gray-800 dark:text-white">{((weatherData.visibility || 0) / 1000).toFixed(1)} km</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne des prévisions */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 h-full transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Prévisions 5 jours</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">3h d'intervalle</span>
              </div>
              
              {forecastData.length > 0 ? (
                <div className="space-y-4">
                  {forecastData.map((day, index) => (
                    <div 
                      key={day.dt} 
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="text-3xl mr-4">
                          {getWeatherIcon(day.weather?.[0]?.id)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {index === 0 ? 'Aujourd\'hui' : new Date(day.dt * 1000).toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {new Date(day.dt * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 dark:text-white text-lg">
                          {Math.round(day.main?.temp_max)}°
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {Math.round(day.main?.temp_min)}°
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {initialLoad ? 'Sélectionnez une ville pour voir les prévisions' : 'Chargement des prévisions...'}
                </div>
              )}

              {/* Conseils météo */}
              {weatherData && weatherData.weather && weatherData.weather.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3">💡 Conseils du jour</h4>
                  <div className="space-y-2">
                    {weatherData.weather[0]?.main === 'Rain' && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                        🌧️ Prévoyez un parapluie aujourd'hui !
                      </p>
                    )}
                    {weatherData.main?.temp > 25 && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg">
                        ☀️ Hydratez-vous régulièrement, il fait chaud !
                      </p>
                    )}
                    {weatherData.wind?.speed > 20 && (
                      <p className="text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                        💨 Vent fort, attention aux objets non fixés !
                      </p>
                    )}
                    {weatherData.weather[0]?.main === 'Clear' && weatherData.main?.temp > 18 && weatherData.main?.temp < 25 && (
                      <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                        🌤️ Conditions parfaites pour une activité en extérieur !
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pied de page professionnel */}
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
                  <WiDaySunny className="text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800 dark:text-white">Ujuvi_Brain</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Intelligence météorologique de pointe pour des prévisions précises et fiables.
              </p>
            </div>
            
            <div>
              <h5 className="font-bold text-gray-800 dark:text-white mb-4">Fonctionnalités</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Prévisions en temps réel</li>
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Alertes météo</li>
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Cartes interactives</li>
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Données historiques</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold text-gray-800 dark:text-white mb-4">Sources de données</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  OpenWeatherMap API
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Stations météo globales
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Satellites météorologiques
                </li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold text-gray-800 dark:text-white mb-4">Contact & Support</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Support technique</li>
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">API Développeurs</li>
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Conditions d'utilisation</li>
                <li className="hover:text-blue-500 dark:hover:text-cyan-400 transition-colors cursor-pointer">Politique de confidentialité</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-600 dark:text-gray-400 text-sm mb-4 md:mb-0">
                © {new Date().getFullYear()} Ujuvi_Brain Weather. Tous droits réservés.
              </div>
              <div className="flex space-x-6">
                <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  🚀 Version 2.0.1
                </span>
                <span className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  ✅ API OpenWeatherMap v2.5
                </span>
                <span className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                  🔒 Données sécurisées
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;