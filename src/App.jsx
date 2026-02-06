import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { 
  WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, 
  WiFog, WiThermometer, WiHumidity, WiStrongWind, WiBarometer,
  WiSunrise, WiSunset, WiCelsius, WiDegrees, WiMoonFull,
  WiDayCloudy, WiNightClear, WiDayRain, WiNightRain,
  WiDaySnow, WiNightSnow, WiDayThunderstorm, WiNightThunderstorm
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
  FiSettings,
  FiDroplet,
  FiWind,
  FiThermometer,
  FiEye,
  FiCloud,
  FiAlertTriangle,
  FiCalendar,
  FiClock,
  FiSunrise,
  FiSunset,
  FiCloudRain,
  FiCloudSnow,
  FiCloudLightning
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, ScatterChart, Scatter, ZAxis,
  Legend, ReferenceLine, Label
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  // États principaux de l'application
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('metric');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [theme, setTheme] = useState('system');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [airQuality, setAirQuality] = useState(null);
  const [uvIndex, setUvIndex] = useState(null);
  const [mapView, setMapView] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [cityImage, setCityImage] = useState(null);
  const [detailedMetrics, setDetailedMetrics] = useState({});
  const [windData, setWindData] = useState([]);
  const [precipitationData, setPrecipitationData] = useState([]);
  
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Configuration de l'API OpenWeatherMap
  const API_KEY = '7af1a4538ae3af0538c6aa916b49a849';
  const BASE_URL = 'https://api.openweathermap.org/data/2.5';

  // Fonction pour détecter et appliquer le thème du système
  const detectSystemTheme = () => {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? 'dark' : 'light';
  };

  const applyTheme = (selectedTheme) => {
    const html = document.documentElement;
    html.classList.remove('light-theme', 'dark-theme');
    
    let actualTheme = selectedTheme;
    
    if (selectedTheme === 'system') {
      actualTheme = detectSystemTheme();
    }
    
    html.classList.add(`${actualTheme}-theme`);
    setTheme(selectedTheme);
    localStorage.setItem('weather-app-theme', selectedTheme);
  };

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

  // Fonctions utilitaires pour les calculs météorologiques
  const calculateDewPoint = (temp, humidity) => {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  };

  const calculateHeatIndex = (temp, humidity) => {
    // Formule simplifiée de l'indice de chaleur
    const c1 = -8.78469475556;
    const c2 = 1.61139411;
    const c3 = 2.33854883889;
    const c4 = -0.14611605;
    const c5 = -0.012308094;
    const c6 = -0.0164248277778;
    const c7 = 0.002211732;
    const c8 = 0.00072546;
    const c9 = -0.000003582;
    
    return c1 + c2*temp + c3*humidity + c4*temp*humidity + 
           c5*temp*temp + c6*humidity*humidity + 
           c7*temp*temp*humidity + c8*temp*humidity*humidity + 
           c9*temp*temp*humidity*humidity;
  };

  const calculateWindChill = (temp, windSpeed) => {
    if (temp > 10) return temp;
    return 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed, 0.16) + 
           0.3965 * temp * Math.pow(windSpeed, 0.16);
  };

  // Cache pour Unsplash
  const unsplashCache = useRef({});

  // Fonction pour récupérer les données météo complètes
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
      let query = cityName.trim();
      
      // Récupération des données météo actuelles
      const weatherResponse = await fetch(
        `${BASE_URL}/weather?q=${query}&units=${unit}&appid=${API_KEY}&lang=fr`
      );
      
      const weatherData = await weatherResponse.json();
      
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
      
      // Prévisions quotidiennes (5 jours)
      const dailyForecasts = forecastData.list.filter((item, index) => index % 8 === 0).slice(0, 5);
      
      // Prévisions horaires (24h)
      const hourlyForecasts = forecastData.list.slice(0, 8);
      
      setWeatherData(weatherData);
      setForecastData(dailyForecasts);
      setHourlyData(hourlyForecasts);
      
      // Récupération de l'image de la ville avec Unsplash
      try {
        const unsplashAccessKey = 'qrsWgH8XMmZrmwOmb-dNRRJoxTkZ4SX75B1d7d03gGk';
        const cacheKey = `${weatherData.name}_${weatherData.sys?.country}`;
        
        // Vérifier le cache
        if (unsplashCache.current[cacheKey]) {
          setCityImage(unsplashCache.current[cacheKey]);
        } else {
          // Tentative 1 : Recherche par nom exact de la ville
          let imageUrl = null;
          
          // Construction des termes de recherche
          const searchTerms = [
            `${weatherData.name} city landscape`,
            `${weatherData.name} skyline`,
            `${weatherData.name} urban`,
            `${weatherData.sys?.country ? weatherData.name + ' ' + weatherData.sys.country : weatherData.name}`,
            `${weatherData.name} aerial view`
          ];
          
          // Essayer plusieurs termes de recherche
          for (const term of searchTerms) {
            const unsplashResponse = await fetch(
              `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&client_id=${unsplashAccessKey}&per_page=1&orientation=landscape`
            );
            
            if (unsplashResponse.ok) {
              const unsplashData = await unsplashResponse.json();
              if (unsplashData.results && unsplashData.results.length > 0) {
                imageUrl = unsplashData.results[0].urls.regular;
                break;
              }
            }
          }
          
          // Si aucune image trouvée, utiliser une image basée sur la météo
          if (!imageUrl) {
            const weatherCondition = weatherData.weather[0]?.main?.toLowerCase() || 'clear';
            const unsplashResponse = await fetch(
              `https://api.unsplash.com/search/photos?query=${encodeURIComponent(weatherCondition + ' weather landscape')}&client_id=${unsplashAccessKey}&per_page=1&orientation=landscape`
            );
            
            if (unsplashResponse.ok) {
              const unsplashData = await unsplashResponse.json();
              if (unsplashData.results && unsplashData.results.length > 0) {
                imageUrl = unsplashData.results[0].urls.regular;
              }
            }
          }
          
          // Si on a une image, l'utiliser, sinon utiliser un gradient
          let newCityImage;
          if (imageUrl) {
            newCityImage = {
              type: 'image',
              url: imageUrl,
              alt: `Vue de ${weatherData.name}`
            };
          } else {
            // Fallback : gradient basé sur la température
            const temp = weatherData.main?.temp;
            let gradient = 'from-blue-400 to-cyan-400';
            if (temp > 25) gradient = 'from-yellow-400 to-orange-400';
            else if (temp > 15) gradient = 'from-green-400 to-teal-400';
            else if (temp > 5) gradient = 'from-blue-300 to-indigo-300';
            else gradient = 'from-blue-200 to-purple-300';
            
            newCityImage = {
              type: 'gradient',
              value: gradient
            };
          }
          
          // Mettre en cache et mettre à jour l'état
          unsplashCache.current[cacheKey] = newCityImage;
          setCityImage(newCityImage);
        }
        
      } catch (unsplashErr) {
        console.log('Unsplash non disponible, utilisation du gradient par défaut');
        // Fallback au gradient
        const temp = weatherData.main?.temp;
        let gradient = 'from-blue-400 to-cyan-400';
        if (temp > 25) gradient = 'from-yellow-400 to-orange-400';
        else if (temp > 15) gradient = 'from-green-400 to-teal-400';
        else if (temp > 5) gradient = 'from-blue-300 to-indigo-300';
        else gradient = 'from-blue-200 to-purple-300';
        
        setCityImage({
          type: 'gradient',
          value: gradient
        });
      }
      
      // Calcul de métriques détaillées
      const metrics = {
        dewPoint: calculateDewPoint(weatherData.main.temp, weatherData.main.humidity),
        heatIndex: calculateHeatIndex(weatherData.main.temp, weatherData.main.humidity),
        windChill: calculateWindChill(weatherData.main.temp, weatherData.wind.speed),
        cloudCoverage: weatherData.clouds?.all || 0,
        visibility: (weatherData.visibility || 0) / 1000,
        feelsLikeDiff: Math.abs(weatherData.main.feels_like - weatherData.main.temp),
      };
      setDetailedMetrics(metrics);
      
      // Préparation des données de vent
      const windChartData = hourlyForecasts.map(hour => ({
        hour: formatHour(hour.dt),
        speed: hour.wind.speed,
        direction: hour.wind.deg,
        gusts: hour.wind.gust || 0
      }));
      setWindData(windChartData);
      
      // Préparation des données de précipitation
      const precipChartData = hourlyForecasts.map(hour => ({
        hour: formatHour(hour.dt),
        rain: hour.rain?.['3h'] || 0,
        snow: hour.snow?.['3h'] || 0,
        pop: hour.pop * 100
      }));
      setPrecipitationData(precipChartData);
      
      // Récupération des données avancées (qualité de l'air, UV)
      if (weatherData.coord) {
        try {
          // Qualité de l'air
          const airQualityResponse = await fetch(
            `${BASE_URL}/air_pollution?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${API_KEY}`
          );
          if (airQualityResponse.ok) {
            const airQualityData = await airQualityResponse.json();
            setAirQuality(airQualityData.list[0]);
          }
          
          // Indice UV
          const uvResponse = await fetch(
            `${BASE_URL}/uvi?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${API_KEY}`
          );
          if (uvResponse.ok) {
            const uvData = await uvResponse.json();
            setUvIndex(uvData.value);
          }
        } catch (err) {
          console.log('Données avancées non disponibles');
        }
      }
      
      setLoading(false);
      setInitialLoad(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Une erreur est survenue');
    }
  };

  // Fonction améliorée pour obtenir l'icône météo
  const getWeatherIcon = (condition, timeOfDay = 'day') => {
    if (!condition) return timeOfDay === 'day' ? 
      <WiDaySunny className="text-yellow-500" /> : 
      <WiNightClear className="text-blue-300" />;
    
    const id = parseInt(condition);
    if (isNaN(id)) return timeOfDay === 'day' ? 
      <WiDaySunny className="text-yellow-500" /> : 
      <WiNightClear className="text-blue-300" />;
    
    // Jour
    if (timeOfDay === 'day') {
      if (id >= 200 && id < 300) return <WiDayThunderstorm className="text-yellow-600" />;
      if (id >= 300 && id < 400) return <WiDayRain className="text-blue-400" />;
      if (id >= 500 && id < 600) return <WiDayRain className="text-blue-500" />;
      if (id >= 600 && id < 700) return <WiDaySnow className="text-blue-300" />;
      if (id >= 700 && id < 800) return <WiFog className="text-gray-400" />;
      if (id === 800) return <WiDaySunny className="text-yellow-500" />;
      if (id > 800 && id < 900) return <WiDayCloudy className="text-gray-500" />;
    } else {
      // Nuit
      if (id >= 200 && id < 300) return <WiNightThunderstorm className="text-purple-400" />;
      if (id >= 300 && id < 400) return <WiNightRain className="text-blue-400" />;
      if (id >= 500 && id < 600) return <WiNightRain className="text-blue-500" />;
      if (id >= 600 && id < 700) return <WiNightSnow className="text-blue-300" />;
      if (id >= 700 && id < 800) return <WiFog className="text-gray-400" />;
      if (id === 800) return <WiNightClear className="text-blue-300" />;
      if (id > 800 && id < 900) return <WiCloudy className="text-gray-500" />;
    }
    
    return <WiDaySunny className="text-yellow-500" />;
  };

  // Fonction pour déterminer si c'est le jour ou la nuit
  const getTimeOfDay = (sunrise, sunset) => {
    if (!sunrise || !sunset) return 'day';
    const now = Date.now() / 1000;
    return now > sunrise && now < sunset ? 'day' : 'night';
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

  const formatHour = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.getHours() + 'h';
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
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
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
            
            // Fetch forecast for current location
            const forecastResponse = await fetch(
              `${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&units=${unit}&appid=${API_KEY}&lang=fr`
            );
            
            if (forecastResponse.ok) {
              const forecastData = await forecastResponse.json();
              const dailyForecasts = forecastData.list.filter((item, index) => index % 8 === 0).slice(0, 5);
              const hourlyForecasts = forecastData.list.slice(0, 8);
              setForecastData(dailyForecasts);
              setHourlyData(hourlyForecasts);
              
              // Calcul des métriques détaillées
              const metrics = {
                dewPoint: calculateDewPoint(data.main.temp, data.main.humidity),
                heatIndex: calculateHeatIndex(data.main.temp, data.main.humidity),
                windChill: calculateWindChill(data.main.temp, data.wind.speed),
                cloudCoverage: data.clouds?.all || 0,
                visibility: (data.visibility || 0) / 1000,
                feelsLikeDiff: Math.abs(data.main.feels_like - data.main.temp),
              };
              setDetailedMetrics(metrics);
            }
            
            setLoading(false);
            setInitialLoad(false);
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

  // Fonction pour obtenir les conseils du jour (corrigée pour toutes les unités)
  const getDailyTips = () => {
    if (!weatherData) return [];
    
    const tips = [];
    const temp = weatherData.main?.temp;
    const condition = weatherData.weather?.[0]?.main;
    const windSpeed = weatherData.wind?.speed;
    const humidity = weatherData.main?.humidity;
    
    // Conversion de la température si nécessaire pour les conseils standardisés
    let tempForTips = temp;
    if (unit === 'imperial') {
      // Convertir Fahrenheit en Celsius pour les conseils standardisés
      tempForTips = (temp - 32) * 5/9;
    }
    
    // Conseils basés sur la température
    if (tempForTips > 30) {
      tips.push({
        icon: '🔥',
        text: 'Température extrêmement élevée ! Évitez les activités en extérieur entre 11h et 16h.',
        color: 'from-red-500 to-orange-500',
        bg: 'red'
      });
    } else if (tempForTips > 25) {
      tips.push({
        icon: '☀️',
        text: 'Il fait chaud ! Hydratez-vous régulièrement et portez des vêtements légers.',
        color: 'from-orange-400 to-yellow-400',
        bg: 'orange'
      });
    } else if (tempForTips < 0) {
      tips.push({
        icon: '❄️',
        text: 'Températures négatives ! Portez plusieurs couches de vêtements et protégez-vous du froid.',
        color: 'from-blue-400 to-cyan-400',
        bg: 'blue'
      });
    } else if (tempForTips < 10) {
      tips.push({
        icon: '🧥',
        text: 'Il fait frais ! Une veste ou un manteau léger sera nécessaire.',
        color: 'from-blue-300 to-cyan-300',
        bg: 'blue-light'
      });
    }
    
    // Conseils basés sur les conditions météo
    if (condition === 'Rain') {
      tips.push({
        icon: '🌧️',
        text: 'Pluie prévue aujourd\'hui ! Prévoyez un parapluie et des vêtements imperméables.',
        color: 'from-blue-500 to-indigo-500',
        bg: 'blue'
      });
    } else if (condition === 'Snow') {
      tips.push({
        icon: '⛄',
        text: 'Neige prévue ! Chaussez-vous correctement et conduisez avec prudence.',
        color: 'from-blue-100 to-cyan-100',
        bg: 'cyan'
      });
    } else if (condition === 'Thunderstorm') {
      tips.push({
        icon: '⚡',
        text: 'Orages prévus ! Évitez les activités en extérieur et les zones dégagées.',
        color: 'from-purple-500 to-pink-500',
        bg: 'purple'
      });
    } else if (condition === 'Clear') {
      tips.push({
        icon: '😎',
        text: 'Ciel dégagé ! Conditions parfaites pour une activité en extérieur.',
        color: 'from-yellow-400 to-orange-400',
        bg: 'yellow'
      });
    }
    
    // Conseils basés sur le vent
    if (windSpeed > 8) {
      tips.push({
        icon: '💨',
        text: 'Vent fort ! Attention aux objets non fixés et soyez prudent en conduisant.',
        color: 'from-gray-400 to-gray-500',
        bg: 'gray'
      });
    }
    
    // Conseils basés sur l'humidité
    if (humidity > 80) {
      tips.push({
        icon: '💧',
        text: 'Humidité élevée ! L\'air est lourd, pensez à vous hydrater.',
        color: 'from-cyan-400 to-blue-400',
        bg: 'cyan'
      });
    } else if (humidity < 30) {
      tips.push({
        icon: '🏜️',
        text: 'Air sec ! Utilisez un humidificateur si nécessaire.',
        color: 'from-yellow-500 to-orange-500',
        bg: 'orange'
      });
    }
    
    // Conseils pour la qualité de l'air
    if (airQuality) {
      const aqi = airQuality.main?.aqi;
      if (aqi >= 4) {
        tips.push({
          icon: '😷',
          text: 'Qualité de l\'air médiocre ! Limitez les activités en extérieur.',
          color: 'from-red-400 to-pink-400',
          bg: 'red'
        });
      }
    }
    
    // Conseils pour l'indice UV
    if (uvIndex) {
      if (uvIndex >= 8) {
        tips.push({
          icon: '⚠️',
          text: 'Indice UV très élevé ! Protection solaire maximale requise.',
          color: 'from-red-500 to-orange-500',
          bg: 'red'
        });
      } else if (uvIndex >= 6) {
        tips.push({
          icon: '☀️',
          text: 'Indice UV élevé ! Utilisez une crème solaire.',
          color: 'from-orange-400 to-yellow-400',
          bg: 'orange'
        });
      }
    }
    
    // Conseils pour le point de rosée
    if (detailedMetrics.dewPoint && detailedMetrics.dewPoint > tempForTips - 2) {
      tips.push({
        icon: '💦',
        text: 'Point de rosée élevé ! Risque de brouillard et de condensation.',
        color: 'from-blue-300 to-cyan-300',
        bg: 'blue'
      });
    }
    
    return tips;
  };

  // Préparation des données pour les graphiques
  const prepareChartData = () => {
    if (!forecastData.length) return [];
    
    return forecastData.map(day => ({
      day: new Date(day.dt * 1000).toLocaleDateString('fr-FR', { weekday: 'short' }),
      temp_max: Math.round(day.main.temp_max),
      temp_min: Math.round(day.main.temp_min),
      humidity: day.main.humidity,
      pop: day.pop * 100,
    }));
  };

  const prepareHourlyChartData = () => {
    if (!hourlyData.length) return [];
    
    return hourlyData.map(hour => ({
      time: formatHour(hour.dt),
      temp: Math.round(hour.main.temp),
      feels_like: Math.round(hour.main.feels_like),
      humidity: hour.main.humidity,
      pop: hour.pop * 100,
    }));
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

  // Fonction pour préparer les données de vent
  useEffect(() => {
    if (hourlyData.length > 0) {
      const windChartData = hourlyData.map(hour => ({
        hour: formatHour(hour.dt),
        speed: hour.wind.speed,
        direction: hour.wind.deg,
        gusts: hour.wind.gust || 0
      }));
      setWindData(windChartData);
    }
  }, [hourlyData]);

  // Fonction pour préparer les données de précipitation
  useEffect(() => {
    if (hourlyData.length > 0) {
      const precipChartData = hourlyData.map(hour => ({
        hour: formatHour(hour.dt),
        rain: hour.rain?.['3h'] || 0,
        snow: hour.snow?.['3h'] || 0,
        pop: hour.pop * 100
      }));
      setPrecipitationData(precipChartData);
    }
  }, [hourlyData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation Bar */}
        <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg mb-8 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
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

              <div className="hidden md:flex items-center space-x-6">
                <button 
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors"
                  onClick={() => setCity('')}
                >
                  <FiHome />
                  <span>Accueil</span>
                </button>
                <button 
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors"
                  onClick={() => setMapView(!mapView)}
                >
                  <FiMap />
                  <span>{mapView ? 'Météo' : 'Carte'}</span>
                </button>
                <button 
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400 transition-colors"
                  onClick={() => setActiveTab('today')}
                >
                  <FiSettings />
                  <span>Paramètres</span>
                </button>

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

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-gray-700 dark:text-gray-300"
              >
                {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
            </div>
          </div>
        </nav>

        {!mapView ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Barre de recherche */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                <form onSubmit={handleSearch} className="relative">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow relative" ref={suggestionsRef}>
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder="Rechercher une ville (ex: Paris, FR ou New York, US)..."
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-cyan-500 bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-white transition-colors backdrop-blur-sm relative z-0"
                        />
                      </motion.div>
                      
                      {suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-1 bg-white/95 dark:bg-gray-700/95 backdrop-blur-lg border border-gray-300 dark:border-gray-600 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                        >
                          {suggestions.map((suggestion, index) => (
                            <motion.div
                              key={`${suggestion.name}-${suggestion.country}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors flex items-center"
                            >
                              <FiMapPin className="mr-3 text-blue-500" />
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">
                                  {suggestion.name}, {suggestion.country}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {suggestion.state ? `${suggestion.state}, ` : ''}{suggestion.country}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-2 flex-1 md:flex-none shadow-lg hover:shadow-xl"
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
                        className="px-4 py-3 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-gray-200 dark:border-gray-600"
                        title="Utiliser ma position actuelle"
                        disabled={loading}
                      >
                        <FiMapPin />
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchWeather(city)}
                        className="px-4 py-3 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-gray-200 dark:border-gray-600"
                        title="Actualiser"
                        disabled={loading || !city.trim()}
                      >
                        <FiRefreshCw />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600 dark:text-gray-400">Unités :</span>
                      <div className="inline-flex bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => setUnit('metric')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${unit === 'metric' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-cyan-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          disabled={loading}
                        >
                          °C
                        </button>
                        <button
                          onClick={() => setUnit('imperial')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${unit === 'imperial' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-cyan-400 shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          disabled={loading}
                        >
                          °F
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Affichage principal */}
              {initialLoad ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 text-center transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                  <div className="text-5xl mb-4 animate-pulse">🌤️</div>
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
                      className="px-4 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:from-blue-200 hover:to-cyan-200 dark:hover:from-blue-800/50 dark:hover:to-cyan-800/50 transition-all"
                    >
                      Paris, FR
                    </button>
                    <button 
                      onClick={() => {
                        setCity('London, GB');
                        fetchWeather('London, GB');
                      }}
                      className="px-4 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:from-blue-200 hover:to-cyan-200 dark:hover:from-blue-800/50 dark:hover:to-cyan-800/50 transition-all"
                    >
                      London, GB
                    </button>
                  </div>
                </div>
              ) : loading ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 text-center transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-cyan-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-300">Chargement des données météo...</p>
                </div>
              ) : error ? (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 text-center transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                  <div className="text-red-500 text-5xl mb-4">⚠️</div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Erreur de recherche</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={() => fetchWeather('Goma, CD')}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all"
                    >
                      Essayer Goma, CD
                    </button>
                    <button 
                      onClick={() => fetchWeather('Kindu, CD')}
                      className="px-6 py-2 bg-gray-200/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      Essayer Kindu, CD
                    </button>
                    <button 
                      onClick={getCurrentLocationWeather}
                      className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                      Ma position
                    </button>
                  </div>
                </div>
              ) : weatherData && (
                <div className="space-y-6">

                  {/* En-tête météo actuelle avec image de fond */}
                  <div className="relative overflow-hidden backdrop-blur-lg rounded-2xl shadow-lg transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                    {/* Conditionnel : Image ou Gradient */}
                    {cityImage ? (
                      cityImage.type === 'image' ? (
                        <>
                          {/* Image Unsplash */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${cityImage.url})` }}
                          />
                          {/* Overlay sombre pour améliorer la lisibilité */}
                          <div className="absolute inset-0 bg-black/40"></div>
                        </>
                      ) : (
                        /* Gradient de secours */
                        <div className={`absolute inset-0 bg-gradient-to-br ${cityImage.value}`}></div>
                      )
                    ) : (
                      /* Gradient par défaut si aucun cityImage (au démarrage) */
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400"></div>
                    )}
                    
                    {/* Overlay supplémentaire pour le contraste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    
                    {/* Contenu principal */}
                    <div className="relative z-10 p-6 md:p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div className="flex items-center gap-4">
                          <div className="text-6xl md:text-7xl animate-pulse">
                            {getWeatherIcon(
                              weatherData.weather[0].id,
                              getTimeOfDay(weatherData.sys?.sunrise, weatherData.sys?.sunset)
                            )}
                          </div>
                          <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                              <FiMapPin className="text-white/90" />
                              {weatherData.name}, {weatherData.sys?.country}
                            </h2>
                            <p className="text-white/80 mt-1">
                              {formatDate(weatherData.dt)}
                            </p>
                            <p className="text-white/60 text-sm">
                              Dernière mise à jour: {new Date((weatherData.dt || 0) * 1000).toLocaleTimeString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 text-right">
                          <div className="text-5xl md:text-6xl font-bold text-white flex items-center justify-end">
                            {Math.round(weatherData.main?.temp)}°{unit === 'metric' ? 'C' : 'F'}
                          </div>
                          <p className="text-white/80 capitalize text-lg">
                            {weatherData.weather?.[0]?.description}
                          </p>
                          <p className="text-sm text-white/60">
                            Ressenti: {Math.round(weatherData.main?.feels_like)}°
                          </p>
                        </div>
                      </div>

                      {/* Conditions météo principales avec animation */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {weatherData.weather && weatherData.weather.length > 0 && (
                          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center border border-white/30">
                            <div className="text-6xl mb-2 animate-pulse">
                              {getWeatherIcon(
                                weatherData.weather[0].id,
                                getTimeOfDay(weatherData.sys?.sunrise, weatherData.sys?.sunset)
                              )}
                            </div>
                            <p className="text-white font-medium text-center">
                              {weatherData.weather[0].main}
                            </p>
                          </div>
                        )}
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                          <div className="flex items-center justify-center mb-2">
                            <FiThermometer className="text-3xl text-white/90" />
                            <span className="ml-2 text-white font-medium">Température</span>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {Math.round(weatherData.main?.temp_max)}° / {Math.round(weatherData.main?.temp_min)}°
                            </div>
                            <p className="text-white/80 text-sm">Max / Min</p>
                          </div>
                        </div>
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                          <div className="flex items-center justify-center mb-2">
                            <FiDroplet className="text-3xl text-white/90" />
                            <span className="ml-2 text-white font-medium">Humidité</span>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {weatherData.main?.humidity}%
                            </div>
                            <p className="text-white/80 text-sm">Relative</p>
                          </div>
                        </div>
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                          <div className="flex items-center justify-center mb-2">
                            <FiWind className="text-3xl text-white/90" />
                            <span className="ml-2 text-white font-medium">Vent</span>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                              {Math.round(weatherData.wind?.speed)} {unit === 'metric' ? 'km/h' : 'mph'}
                            </div>
                            <p className="text-white/80 text-sm">Vitesse</p>
                          </div>
                        </div>
                      </div>

                      {/* Prévisions horaires en ligne horizontale */}
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <FiClock className="text-white/90" />
                          Prévisions horaires (24h)
                        </h3>
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 overflow-x-auto">
                          <div className="flex space-x-4 min-w-max pb-4">
                            {hourlyData.map((hour, index) => (
                              <motion.div
                                key={hour.dt}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -5, scale: 1.05 }}
                                onClick={() => setSelectedHour(hour)}
                                className={`flex flex-col items-center p-4 rounded-xl min-w-[100px] cursor-pointer transition-all ${
                                  selectedHour?.dt === hour.dt 
                                    ? 'bg-white/40 border-2 border-white' 
                                    : 'bg-white/20 hover:bg-white/30'
                                }`}
                              >
                                <p className="font-medium text-white mb-2">
                                  {formatHour(hour.dt)}
                                </p>
                                <div className="text-3xl mb-2">
                                  {getWeatherIcon(hour.weather[0].id, index > 6 && index < 18 ? 'day' : 'night')}
                                </div>
                                <p className="text-xl font-bold text-white">
                                  {Math.round(hour.main.temp)}°
                                </p>
                                <p className="text-sm text-white/80 mt-1">
                                  {Math.round(hour.main.feels_like)}°
                                </p>
                                <div className="flex items-center justify-center mt-2 text-white/90">
                                  <FiDroplet className="mr-1" size={14} />
                                  <span className="text-xs">{hour.main.humidity}%</span>
                                </div>
                                {hour.pop > 0 && (
                                  <div className="flex items-center justify-center mt-1 text-white/90">
                                    <FiCloudRain size={14} />
                                    <span className="text-xs ml-1">{Math.round(hour.pop * 100)}%</span>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                          
                          {/* Graphique amélioré pour les prévisions horaires */}
                          <div className="h-64 mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={prepareHourlyChartData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.1} />
                                <XAxis 
                                  dataKey="time" 
                                  stroke="#ffffff"
                                  fontSize={12}
                                />
                                <YAxis 
                                  yAxisId="left"
                                  stroke="#ffffff"
                                  fontSize={12}
                                  label={{ value: '°C', angle: -90, position: 'insideLeft', fill: '#ffffff' }}
                                />
                                <YAxis 
                                  yAxisId="right"
                                  orientation="right"
                                  stroke="#ffffff"
                                  fontSize={12}
                                  label={{ value: '%', angle: 90, position: 'insideRight', fill: '#ffffff' }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    borderColor: '#ffffff',
                                    borderRadius: '10px',
                                    color: '#000000'
                                  }}
                                />
                                <Legend />
                                <Area 
                                  yAxisId="left"
                                  type="monotone" 
                                  dataKey="temp" 
                                  name="Température"
                                  stroke="#ffffff" 
                                  fill="rgba(255, 255, 255, 0.3)" 
                                  strokeWidth={2}
                                />
                                <Line 
                                  yAxisId="left"
                                  type="monotone" 
                                  dataKey="feels_like" 
                                  name="Ressenti"
                                  stroke="#ffdddd" 
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                                <Bar 
                                  yAxisId="right"
                                  dataKey="pop" 
                                  name="Précipitation %"
                                  fill="rgba(255, 255, 255, 0.5)"
                                  fillOpacity={0.5}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Informations supplémentaires */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center transition-colors border border-white/30">
                          <WiBarometer className="text-2xl text-white mr-3" />
                          <div>
                            <p className="text-white/80 text-sm">Pression</p>
                            <p className="font-bold text-white">{weatherData.main?.pressure} hPa</p>
                          </div>
                        </div>
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center transition-colors border border-white/30">
                          <FiSunrise className="text-2xl text-white mr-3" />
                          <div>
                            <p className="text-white/80 text-sm">Lever du soleil</p>
                            <p className="font-bold text-white">{formatTime(weatherData.sys?.sunrise)}</p>
                          </div>
                        </div>
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center transition-colors border border-white/30">
                          <FiSunset className="text-2xl text-white mr-3" />
                          <div>
                            <p className="text-white/80 text-sm">Coucher du soleil</p>
                            <p className="font-bold text-white">{formatTime(weatherData.sys?.sunset)}</p>
                          </div>
                        </div>
                        
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center transition-colors border border-white/30">
                          <FiEye className="text-2xl text-white mr-3" />
                          <div>
                            <p className="text-white/80 text-sm">Visibilité</p>
                            <p className="font-bold text-white">{((weatherData.visibility || 0) / 1000).toFixed(1)} km</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nouveaux graphiques avancés */}
                  {weatherData && forecastData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Graphique de vent en radar */}
                      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                          <FiWind className="text-blue-500" />
                          Analyse du Vent
                        </h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                              <XAxis 
                                type="number" 
                                dataKey="direction" 
                                name="Direction"
                                unit="°"
                                domain={[0, 360]}
                                ticks={[0, 90, 180, 270, 360]}
                              >
                                <Label value="Direction (degrés)" offset={-5} position="insideBottom" fill="#6B7280" />
                              </XAxis>
                              <YAxis 
                                type="number" 
                                dataKey="speed" 
                                name="Vitesse"
                                unit={unit === 'metric' ? 'km/h' : 'mph'}
                              >
                                <Label value="Vitesse" angle={-90} position="insideLeft" fill="#6B7280" />
                              </YAxis>
                              <ZAxis type="number" dataKey="gusts" range={[50, 400]} name="Rafales" />
                              <Tooltip 
                                formatter={(value, name) => {
                                  if (name === 'direction') {
                                    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
                                    const index = Math.round((value % 360) / 45) % 8;
                                    return [`${value}° (${directions[index]})`, 'Direction'];
                                  }
                                  return [value, name];
                                }}
                              />
                              <Scatter 
                                name="Vent" 
                                data={windData} 
                                fill="#3B82F6"
                                shape="circle"
                              />
                              <ReferenceLine y={0} stroke="#666" />
                              <ReferenceLine x={0} stroke="#666" />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Moyenne</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">
                              {Math.round(windData.reduce((acc, curr) => acc + curr.speed, 0) / windData.length)} {unit === 'metric' ? 'km/h' : 'mph'}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Max Rafales</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">
                              {Math.max(...windData.map(w => w.gusts))} {unit === 'metric' ? 'km/h' : 'mph'}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Direction</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">
                              {weatherData.wind?.deg}°
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Graphique de précipitation */}
                      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                          <FiCloudRain className="text-blue-500" />
                          Précipitations
                        </h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={precipitationData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                              <XAxis dataKey="hour" stroke="#6B7280" fontSize={12} />
                              <YAxis stroke="#6B7280" fontSize={12} label={{ value: 'mm', angle: -90, position: 'insideLeft' }} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="rain" name="Pluie (mm)" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="snow" name="Neige (mm)" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                              <Line 
                                type="monotone" 
                                dataKey="pop" 
                                name="Probabilité %"
                                stroke="#EF4444"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total pluie 24h</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">
                              {precipitationData.reduce((acc, curr) => acc + curr.rain, 0).toFixed(1)} mm
                            </p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Max probabilité</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white">
                              {Math.max(...precipitationData.map(p => p.pop))}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Métriques avancées */}
                  {weatherData && (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <FiThermometer className="text-blue-500" />
                        Métriques Avancées
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 backdrop-blur-sm border border-blue-200 dark:border-blue-700/30">
                          <div className="flex items-center mb-2">
                            <FiDroplet className="text-blue-500 dark:text-cyan-400 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Point de rosée</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-white">
                            {detailedMetrics.dewPoint?.toFixed(1)}°
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {detailedMetrics.dewPoint > weatherData.main.temp - 2 ? 'Condensation probable' : 'Air sec'}
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-orange-50/80 to-red-50/80 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 backdrop-blur-sm border border-orange-200 dark:border-orange-700/30">
                          <div className="flex items-center mb-2">
                            <FiSun className="text-orange-500 dark:text-orange-400 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Indice de chaleur</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-white">
                            {detailedMetrics.heatIndex?.toFixed(1)}°
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {detailedMetrics.heatIndex > 27 ? 'Risque de coup de chaleur' : 'Confortable'}
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-4 backdrop-blur-sm border border-cyan-200 dark:border-cyan-700/30">
                          <div className="flex items-center mb-2">
                            <FiWind className="text-cyan-500 dark:text-cyan-400 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Refroidissement éolien</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-white">
                            {detailedMetrics.windChill?.toFixed(1)}°
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {detailedMetrics.windChill < weatherData.main.temp ? 'Ressenti plus froid' : 'Normal'}
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl p-4 backdrop-blur-sm border border-gray-200 dark:border-gray-700/30">
                          <div className="flex items-center mb-2">
                            <FiCloud className="text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Couverture nuageuse</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-white">
                            {detailedMetrics.cloudCoverage}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {detailedMetrics.cloudCoverage > 70 ? 'Très nuageux' : detailedMetrics.cloudCoverage > 30 ? 'Partiellement nuageux' : 'Dégagé'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conseils du jour améliorés */}
                  {weatherData && weatherData.weather && (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <FiAlertTriangle className="text-yellow-500" />
                        Conseils du jour
                      </h3>
                      <div className="space-y-3">
                        {getDailyTips().map((tip, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-gradient-to-r ${tip.color} rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-gray-600/50`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{tip.icon}</span>
                              <p className="text-white font-medium">{tip.text}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Colonne latérale */}
            <div className="space-y-6">
              {/* Prévisions 5 jours */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 h-full transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Prévisions 5 jours</h3>
                  <FiCalendar className="text-gray-500 dark:text-gray-400" />
                </div>
                
                {forecastData.length > 0 ? (
                  <div className="space-y-4">
                    {forecastData.map((day, index) => (
                      <div 
                        key={day.dt} 
                        className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all group backdrop-blur-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                      >
                        <div className="flex items-center">
                          <div className="text-3xl mr-4 group-hover:scale-110 transition-transform">
                            {getWeatherIcon(day.weather?.[0]?.id, 'day')}
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

                {/* Graphique des prévisions */}
                {forecastData.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Évolution de la température</h4>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={prepareChartData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                          <XAxis 
                            dataKey="day" 
                            stroke="#6B7280"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#6B7280"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: theme === 'dark' ? '#1F2937' : 'white',
                              borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                              borderRadius: '10px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="temp_max" 
                            stroke="#EF4444" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="temp_min" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Indices avancés */}
              {(airQuality || uvIndex !== null) && (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Indices avancés</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {airQuality && (
                      <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 backdrop-blur-sm border border-blue-200 dark:border-blue-700/30">
                        <div className="flex items-center mb-2">
                          <FiWind className="text-blue-500 dark:text-cyan-400 mr-2" />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Qualité air</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">
                          {airQuality.main?.aqi}/5
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {airQuality.main?.aqi <= 2 ? 'Bonne' : airQuality.main?.aqi <= 3 ? 'Modérée' : 'Médiocre'}
                        </div>
                      </div>
                    )}
                    
                    {uvIndex !== null && (
                      <div className="bg-gradient-to-br from-yellow-50/80 to-orange-50/80 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 backdrop-blur-sm border border-yellow-200 dark:border-yellow-700/30">
                        <div className="flex items-center mb-2">
                          <FiSun className="text-yellow-500 dark:text-yellow-400 mr-2" />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Indice UV</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">
                          {uvIndex.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {uvIndex <= 2 ? 'Faible' : uvIndex <= 5 ? 'Modéré' : uvIndex <= 7 ? 'Élevé' : 'Très élevé'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Vue Carte */
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 transition-colors duration-300 border border-white/20 dark:border-gray-700/20">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Carte météorologique</h2>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-8 text-center h-96 flex flex-col items-center justify-center">
              <FiMap className="text-6xl text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">Fonctionnalité carte en développement</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Cette fonctionnalité affichera une carte interactive avec les conditions météo en temps réel
              </p>
              <button
                onClick={() => setMapView(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                Retour aux prévisions
              </button>
            </div>
          </div>
        )}

        {/* Modal pour les détails horaires */}
        <AnimatePresence>
          {selectedHour && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedHour(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    Détails pour {formatHour(selectedHour.dt)}
                  </h3>
                  <button
                    onClick={() => setSelectedHour(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiX size={24} />
                  </button>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">
                    {getWeatherIcon(selectedHour.weather[0].id, 'day')}
                  </div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    {Math.round(selectedHour.main.temp)}°
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 capitalize">
                    {selectedHour.weather[0].description}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Ressenti</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {Math.round(selectedHour.main.feels_like)}°
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Humidité</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {selectedHour.main.humidity}%
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Pression</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {selectedHour.main.pressure} hPa
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Vent</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      {Math.round(selectedHour.wind.speed)} {unit === 'metric' ? 'km/h' : 'mph'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Probabilité de précipitation</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${selectedHour.pop * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">0%</span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {Math.round(selectedHour.pop * 100)}%
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">100%</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pied de page */}
        <footer className="mt-12 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
            © {new Date().getFullYear()} Ujuvi_Brain Weather - Intelligence Météorologique Avancée
            <p className="mt-2">Données fournies par OpenWeatherMap API • Interface développée avec React & Tailwind CSS</p>
            <div className="mt-4 flex justify-center space-x-4">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                Afrix Global
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs">
                Martin Shabani
              </span>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs">
                martinshabani7@gmail.com
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;