import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useJsApiLoader,
} from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import AppHeader from '../../../components/AppHeader'
import ProfileSidebar from '../components/ProfileSidebar'
import type { ProfileEditableFields } from '../models/user.model'
import { authService } from '../../../services/auth.service'
import MapInfoWindow from '../components/MapInfoWindow'
import type { AuthenticatedUser } from '../models/user.model'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  PAGINATION_DELAY_MS,
  RADIUS_OPTIONS,
} from '../utils/mapConfig'
import { calculateDistanceMeters, centersMatch } from '../utils/mapGeometry'
import type {
  GymMarker,
  NotificationMessage,
  PoiSelection,
  ResultsMeta,
} from '../models/gym-location.model'

export default function Gyms() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const libraries = useMemo<Libraries>(() => ['places'], [])
  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      clickableIcons: true,
    }),
    [],
  )

  const navigate = useNavigate()
  const initialIsAuthenticated = authService.isAuthenticated()
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [gyms, setGyms] = useState<GymMarker[]>([])
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [searchCenter, setSearchCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | undefined>(
    undefined,
  )
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null)
  const [visibleGymId, setVisibleGymId] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [notification, setNotification] = useState<NotificationMessage | null>(null)
  const [searchRadius, setSearchRadius] = useState<number>(RADIUS_OPTIONS[0])
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(true)
  const [locationPromptError, setLocationPromptError] = useState<string | null>(null)
  const [hasUserInitiatedSearch, setHasUserInitiatedSearch] = useState(false)
  const [selectedPoi, setSelectedPoi] = useState<PoiSelection | null>(null)
  const [isPoiLoading, setIsPoiLoading] = useState(false)
  const poiRequestIdRef = useRef(0)
  const lastGymSelectionRef = useRef<string | null>(null)
  const gymsRef = useRef<GymMarker[]>([])
  const lastResultsMetaRef = useRef<ResultsMeta | null>(null)
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'wirtualny-trener-gyms-map',
    googleMapsApiKey: apiKey ?? '',
    libraries,
    preventGoogleFontsLoading: true,
  })

  const mapContainerStyle = useMemo(
    () => ({ width: '100%', height: '100%', borderRadius: '1rem' }),
    [],
  )

  const mapMarkers = useMemo(() => {
    const selected = gyms.find((gym) => gym.id === selectedGymId)
    return { items: gyms, selected }
  }, [gyms, selectedGymId])

  const clearGymSelection = useCallback(() => {
    setSelectedGymId(null)
    setVisibleGymId(null)
    lastGymSelectionRef.current = null
  }, [])

  useEffect(() => {
    if (selectedGymId === null) {
      setVisibleGymId(null)
      lastGymSelectionRef.current = null
    }
  }, [selectedGymId])

  useEffect(() => {
    let active = true

    if (!isAuthenticated) {
      setUser(null)
      return
    }

    authService
      .getProfile()
      .then((profile: AuthenticatedUser) => {
        if (!active) {
          return
        }
        setUser(profile)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        console.error('Nie udało się pobrać profilu użytkownika:', error)
        authService.logout()
        setIsAuthenticated(false)
        setUser(null)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    gymsRef.current = gyms
  }, [gyms])

  const visibleGym = useMemo(
    () => gyms.find((gym) => gym.id === visibleGymId),
    [gyms, visibleGymId],
  )

  const ensurePlacesService = useCallback(() => {
    if (!map || !window.google?.maps?.places) {
      return null
    }

    if (!placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(map)
    }

    return placesServiceRef.current
  }, [map])

  const handleLogout = useCallback(() => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('/')
  }, [navigate])

  const handleProfileSave = useCallback(async (changes: ProfileEditableFields) => {
    const updated = await authService.updateProfile(changes)
    setUser(updated)
    if (updated.themePreference) {
      document.documentElement.setAttribute('data-theme', updated.themePreference)
      localStorage.setItem('theme', updated.themePreference)
      window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: updated.themePreference }))
    }
  }, [])

  const handleAvatarUpload = useCallback(async (avatarDataUrl: string) => {
    await handleProfileSave({ avatarDataUrl })
  }, [handleProfileSave])

  const handleThemeSelect = useCallback(async (theme: string) => {
    await handleProfileSave({ themePreference: theme })
  }, [handleProfileSave])

  const handleEmailChange = useCallback(async (payload: { newEmail: string; currentPassword: string }) => {
    const updated = await authService.updateEmail(payload)
    setUser(updated)
  }, [])

  const handlePasswordChange = useCallback(async (payload: { newPassword: string; currentPassword: string }) => {
    await authService.updatePassword(payload)
  }, [])

  const userMarkerIcon = useMemo<google.maps.Symbol | undefined>(() => {
    if (!isLoaded || !window.google) {
      return undefined
    }

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#2563eb',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    }
  }, [isLoaded])

  const focusMapOn = useCallback(
    (position: google.maps.LatLngLiteral, onSettled?: () => void) => {
      if (!map) {
        onSettled?.()
        return
      }

      map.panTo(position)
      window.setTimeout(() => {
        map.panBy(0, -140)
        if (onSettled) {
          const eventApi = window.google?.maps?.event
          if (eventApi && typeof eventApi.addListenerOnce === 'function') {
            eventApi.addListenerOnce(map, 'idle', () => {
              onSettled()
            })
          } else {
            onSettled()
          }
        }
      }, 0)
    },
    [map],
  )

  const runNearbySearch = useCallback(
    (location: google.maps.LatLngLiteral, radius?: number) => {
      const service = ensurePlacesService()

      if (!map || !service) {
        return
      }

      setIsSearching(true)
      setNotification(null)
      setSelectedPoi(null)
      clearGymSelection()

      const effectiveRadius = radius ?? searchRadius
      const aggregated: google.maps.places.PlaceResult[] = []
      const seenPlaceIds = new Set<string>()
      const previousMeta = lastResultsMetaRef.current
      const currentMeta: ResultsMeta = { center: location, radius: effectiveRadius }
      const shouldMergePrevious =
        previousMeta !== null &&
        centersMatch(previousMeta.center, currentMeta.center) &&
        effectiveRadius >= previousMeta.radius
      const finalizeFromAggregated = () => {
        const normalized = Array.from(aggregated)
          .map<GymMarker | null>((place) => {
            const locationValue = place.geometry?.location
            const lat = locationValue?.lat?.()
            const lng = locationValue?.lng?.()

            if (typeof lat !== 'number' || typeof lng !== 'number') {
              return null
            }

            const position = { lat, lng }
            const distanceMeters = calculateDistanceMeters(location, position)

            const key = place.place_id ?? `${lat}-${lng}`
            if (seenPlaceIds.has(key)) {
              return null
            }
            seenPlaceIds.add(key)

            return {
              id: place.place_id ?? `${lat}-${lng}`,
              name: place.name ?? 'Siłownia',
              position,
              address: place.vicinity ?? place.formatted_address,
              rating: place.rating,
              totalRatings: place.user_ratings_total,
              mapsUrl: place.place_id
                ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                : undefined,
              distanceMeters,
            }
          })
          .filter((gym): gym is GymMarker => gym !== null)
          .filter(
            (gym) =>
              gym.distanceMeters === undefined || gym.distanceMeters <= effectiveRadius,
          )
          .sort((a, b) => {
            if (a.distanceMeters !== undefined && b.distanceMeters !== undefined) {
              return a.distanceMeters - b.distanceMeters
            }
            return 0
          })

        const merged = new Map<string, GymMarker>()
        const addGym = (gym: GymMarker) => {
          if (!merged.has(gym.id)) {
            merged.set(gym.id, gym)
          }
        }

        if (shouldMergePrevious) {
          const previousGymsSnapshot = gymsRef.current
          previousGymsSnapshot.forEach((gym) => {
            const distanceMeters = calculateDistanceMeters(location, gym.position)
            if (distanceMeters <= effectiveRadius) {
              addGym({ ...gym, distanceMeters })
            }
          })
        }

        normalized.forEach(addGym)

        const result = Array.from(merged.values()).sort((a, b) => {
          if (a.distanceMeters !== undefined && b.distanceMeters !== undefined) {
            return a.distanceMeters - b.distanceMeters
          }
          return 0
        })

        setGyms(result)
        gymsRef.current = result

        if (result.length === 0) {
          setNotification({
            type: 'info',
            message:
              'Nie znaleziono siłowni w pobliżu tej lokalizacji. Spróbuj zwiększyć obszar wyszukiwania.',
          })
        }

        setIsSearching(false)
        lastResultsMetaRef.current = currentMeta
      }

      const request: google.maps.places.PlaceSearchRequest = {
        location,
        radius: effectiveRadius,
        type: 'gym',
        keyword: 'gym',
      }

      const handleResults: (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus,
        pagination?: google.maps.places.PlaceSearchPagination | null,
      ) => void = (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          aggregated.push(...results)

          if (pagination && pagination.hasNextPage) {
            window.setTimeout(() => {
              pagination.nextPage()
            }, PAGINATION_DELAY_MS)
            return
          }

          finalizeFromAggregated()
          return
        }

        if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setGyms([])
          setNotification({
            type: 'info',
            message:
              'Nie znaleziono siłowni w pobliżu tej lokalizacji. Spróbuj przesunąć mapę.',
          })
          setIsSearching(false)
          lastResultsMetaRef.current = currentMeta
          return
        }

        setGyms([])
        setNotification({
          type: 'error',
          message: 'Nie udało się pobrać listy siłowni. Spróbuj ponownie później.',
        })
        setIsSearching(false)
        lastResultsMetaRef.current = currentMeta
      }

      service.nearbySearch(request, handleResults)
    },
    [clearGymSelection, ensurePlacesService, map, searchRadius],
  )

  useEffect(() => {
    if (!isLoaded || !map || !hasUserInitiatedSearch) {
      return
    }

    runNearbySearch(searchCenter)
  }, [hasUserInitiatedSearch, isLoaded, map, runNearbySearch, searchCenter])

  const handleRequestLocation = () => {
    if (isLocating) {
      return
    }
    setLocationPromptError(null)

    if (!('geolocation' in navigator)) {
      setLocationPromptError(
        'Twoja przeglądarka nie obsługuje geolokalizacji. Przesuń mapę ręcznie, aby wyszukać siłownie.',
      )
      setNotification({
        type: 'info',
        message: 'Brak wsparcia geolokalizacji. Możesz przesunąć mapę, by wyszukać siłownie.',
      })
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: google.maps.LatLngLiteral = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setUserLocation(location)
        setSearchCenter(location)
        setSelectedGymId(null)
        map?.panTo(location)
        map?.setZoom(14)
        setHasUserInitiatedSearch(true)
        runNearbySearch(location)
        setIsLocating(false)
        setIsLocationPromptOpen(false)
        setNotification({
          type: 'info',
          message: 'Wyświetlam siłownie w Twojej okolicy.',
        })
      },
      (error) => {
        setIsLocating(false)
        setLocationPromptError(
          'Nie udało się pobrać lokalizacji. Upewnij się, że udzieliłeś zgody i spróbuj ponownie.',
        )
        setNotification({
          type: 'info',
          message:
            error.code === error.PERMISSION_DENIED
              ? 'Nie mam dostępu do Twojej lokalizacji. Zezwól przeglądarce lub przesuń mapę ręcznie.'
              : 'Nie udało się pobrać Twojej lokalizacji. Możesz przesunąć mapę ręcznie.',
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const handleSkipLocationPrompt = useCallback(() => {
    setHasUserInitiatedSearch(true)
    setIsLocationPromptOpen(false)
    setNotification({
      type: 'info',
      message: 'Możesz przesunąć mapę i wyszukać siłownie w innej lokalizacji.',
    })
    runNearbySearch(searchCenter)
  }, [runNearbySearch, searchCenter])

  const handleRefreshClick = () => {
    if (!map) {
      return
    }

    const center = map.getCenter()
    if (!center) {
      return
    }

    const position = {
      lat: center.lat(),
      lng: center.lng(),
    }

    setSearchCenter(position)
    runNearbySearch(position)
  }

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius)
    setSelectedGymId(null)
    runNearbySearch(searchCenter, radius)
  }

  const handleGymMarkerClick = (gym: GymMarker) => {
    lastGymSelectionRef.current = gym.id
    setSelectedPoi(null)
    setSelectedGymId(gym.id)
    setVisibleGymId(null)

    focusMapOn(gym.position, () => {
      if (lastGymSelectionRef.current === gym.id) {
        setVisibleGymId(gym.id)
      }
    })
  }

  const handleListClick = (gym: GymMarker) => {
    handleGymMarkerClick(gym)
  }

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  const handleMapUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleSearchBoxLoad = (searchBox: google.maps.places.SearchBox) => {
    searchBoxRef.current = searchBox
  }

  const handleSearchBoxUnmount = () => {
    searchBoxRef.current = null
  }

  const handleSearchBoxPlacesChanged = () => {
    const places = searchBoxRef.current?.getPlaces()

    if (!places || places.length === 0) {
      setNotification({
        type: 'info',
        message: 'Nie znalazłem takiej lokalizacji. Spróbuj innego zapytania.',
      })
      return
    }

    const place = places[0]
    const location = place.geometry?.location
    const viewport = place.geometry?.viewport

    if (!location) {
      setNotification({
        type: 'info',
        message: 'Nie udało się ustalić współrzędnych tej lokalizacji.',
      })
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: location.lat(),
      lng: location.lng(),
    }

    setSearchCenter(position)
    setSelectedGymId(null)
    setNotification(null)

    if (viewport && map) {
      map.fitBounds(viewport)
    } else {
      map?.panTo(position)
      map?.setZoom(14)
    }

    runNearbySearch(position)
    searchInputRef.current?.blur()
  }

  const missingApiKey = !apiKey

  const revealPoiWhenReady = useCallback(
    (poiDetails: PoiSelection, requestId: number) => {
      const commit = () => {
        if (poiRequestIdRef.current !== requestId) {
          return
        }

        focusMapOn(poiDetails.position, () => {
          if (poiRequestIdRef.current !== requestId) {
            return
          }
          setSelectedPoi(poiDetails)
          setIsPoiLoading(false)
        })
      }

      if (poiDetails.photoUrl) {
        const preload = new Image()
        preload.onload = commit
        preload.onerror = commit
        preload.src = poiDetails.photoUrl
      } else {
        commit()
      }
    },
    [focusMapOn],
  )

  const handleMapPoiClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      const mapEvent = event as google.maps.MapMouseEvent & { placeId?: string }
      const placeIdValue = mapEvent.placeId

      if (!placeIdValue) {
        setSelectedPoi(null)
        return
      }

      event.stop()

      const service = ensurePlacesService()
      if (!service) {
        return
      }

      const requestId = ++poiRequestIdRef.current
      setIsPoiLoading(true)
      setSelectedPoi(null)
      const placeId = placeIdValue

      service.getDetails(
        {
          placeId,
          fields: [
            'name',
            'formatted_address',
            'place_id',
            'rating',
            'user_ratings_total',
            'geometry',
            'url',
            'photos',
            'price_level',
            'vicinity',
            'types',
            'opening_hours',
          ],
        },
        (result, status) => {
          if (poiRequestIdRef.current !== requestId) {
            return
          }

          if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
            setSelectedPoi(null)
            setIsPoiLoading(false)
            return
          }

          const location = result.geometry?.location ?? event.latLng
          if (!location) {
            setIsPoiLoading(false)
            return
          }

          const position = {
            lat: location.lat(),
            lng: location.lng(),
          }

          const priceLevelText =
            typeof result.price_level === 'number'
              ? '• ' + 'zł'.repeat(Math.min(result.price_level + 1, 4))
              : undefined

          const isOpenText =
            result.opening_hours && typeof result.opening_hours.isOpen === 'function'
              ? result.opening_hours.isOpen()
                ? 'Otwarte teraz'
                : undefined
              : undefined

          setSelectedGymId(null)
          const poiDetails: PoiSelection = {
            id: result.place_id ?? placeId,
            name: result.name ?? 'Miejsce',
            position,
            address: result.formatted_address ?? result.vicinity,
            rating: result.rating,
            totalRatings: result.user_ratings_total,
            mapsUrl:
              result.url ?? (result.place_id
                ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
                : undefined),
            photoUrl: result.photos?.[0]?.getUrl({ maxWidth: 320, maxHeight: 180 }),
            priceLevelText,
            isOpenText,
            category: result.types?.[0]?.replace(/_/g, ' '),
          }
          revealPoiWhenReady(poiDetails, requestId)
        },
      )
    },
    [ensurePlacesService, revealPoiWhenReady],
  )

  return (
    <div className="min-h-screen bg-base-200">
      <AppHeader
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onAvatarClick={() => setProfileDrawerOpen(true)}
      />

      <header className="bg-transparent py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-6 sm:p-10 shadow-xl text-base-content">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Znajdź siłownię</p>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Znajdź siłownię w pobliżu</h1>
              <p className="text-base leading-relaxed text-base-content/80 max-w-3xl">
                Włącz lokalizację, aby zobaczyć rekomendowane siłownie w Twojej okolicy. Możesz też przesunąć mapę i wyszukać obiekty w innym miejscu.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-base-content/80">
                <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Lokalizacja</span>
                <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Mapa</span>
                <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Rekomendacje</span>
              </div>
            </div>
          </section>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {missingApiKey && (
          <div className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-bold">Wymagany klucz Google Maps</h3>
              <p>Dodaj zmienną środowiskową VITE_GOOGLE_MAPS_API_KEY, aby wczytać mapę.</p>
            </div>
          </div>
        )}

          <ProfileSidebar
            isOpen={isProfileDrawerOpen}
            onClose={() => setProfileDrawerOpen(false)}
            user={user}
            isAuthenticated={isAuthenticated}
            onProfileSave={handleProfileSave}
            onAvatarUpload={handleAvatarUpload}
            onThemeSelect={handleThemeSelect}
            onEmailChange={handleEmailChange}
            onPasswordChange={handlePasswordChange}
          />

        {notification && (
          <div
            className={`alert ${
              notification.type === 'error' ? 'alert-error' : 'alert-info'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{notification.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl h-full">
              <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="card-title">Mapa siłowni</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {isLoaded && !loadError && !missingApiKey ? (
                      <StandaloneSearchBox
                        onLoad={handleSearchBoxLoad}
                        onUnmount={handleSearchBoxUnmount}
                        onPlacesChanged={handleSearchBoxPlacesChanged}
                      >
                        <div className="form-control w-full sm:w-64">
                          <input
                            ref={searchInputRef}
                            type="text"
                            className="input input-sm input-bordered w-full"
                            placeholder="Wyszukaj miejscowość lub adres"
                            aria-label="Wyszukaj miejscowość lub adres"
                          />
                        </div>
                      </StandaloneSearchBox>
                    ) : (
                      <div className="form-control w-full sm:w-64">
                        <input
                          type="text"
                          className="input input-sm input-bordered w-full"
                          placeholder="Wyszukaj miejscowość lub adres"
                          aria-label="Wyszukaj miejscowość lub adres"
                          disabled
                        />
                      </div>
                    )}
                    <div className="join">
                      {RADIUS_OPTIONS.map((radius) => (
                        <button
                          key={radius}
                          className={`join-item btn btn-sm ${
                            searchRadius === radius ? 'btn-primary' : 'btn-outline'
                          }`}
                          onClick={() => handleRadiusChange(radius)}
                          disabled={isSearching}
                        >
                          {radius / 1000} km
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleRequestLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Lokalizuję
                        </>
                      ) : (
                        'Moja lokalizacja'
                      )}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleRefreshClick}
                      disabled={!map || isSearching}
                    >
                      {isSearching ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Szukam...
                        </>
                      ) : (
                        'Szukaj w tym obszarze'
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative w-full h-[520px] rounded-2xl border border-base-300 bg-base-100/40">
                  {!isLoaded && !loadError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-base-200">
                      <div className="text-center">
                        <div className="loading loading-spinner loading-lg text-primary"></div>
                        <p className="mt-3 text-base-content/70">Ładuję mapę...</p>
                      </div>
                    </div>
                  )}

                  {loadError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-base-200">
                      <div className="alert alert-error max-w-md">
                        <span>
                          Nie udało się wczytać Google Maps. Sprawdź klucz API i połączenie z internetem.
                        </span>
                      </div>
                    </div>
                  )}

                  {isLoaded && !loadError && !missingApiKey && (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={searchCenter}
                      zoom={DEFAULT_ZOOM}
                      options={mapOptions}
                      onLoad={handleMapLoad}
                      onUnmount={handleMapUnmount}
                      onClick={handleMapPoiClick}
                    >
                      {userLocation && (
                        <Marker
                          position={userLocation}
                          icon={userMarkerIcon}
                          title="Twoja lokalizacja"
                        />
                      )}

                      {mapMarkers.items.map((gym) => (
                        <Marker
                          key={gym.id}
                          position={gym.position}
                          onClick={() => handleGymMarkerClick(gym)}
                          title={gym.name}
                          zIndex={visibleGymId === gym.id ? 3 : selectedGymId === gym.id ? 2 : 1}
                        />
                      ))}

                      {visibleGym && (
                        <MapInfoWindow
                          position={visibleGym.position}
                          onClose={() => setSelectedGymId(null)}
                        >
                          <div className="space-y-2">
                            <p className="font-semibold text-base">
                              {visibleGym.name}
                            </p>
                            {visibleGym.address && (
                              <p className="text-sm text-slate-600 leading-snug">
                                {visibleGym.address}
                              </p>
                            )}
                            {(visibleGym.rating || visibleGym.totalRatings) && (
                              <p className="text-xs text-slate-500">
                                {visibleGym.rating
                                  ? `Ocena ${visibleGym.rating.toFixed(1)}`
                                  : 'Brak oceny'}
                                {visibleGym.totalRatings
                                  ? ` • ${visibleGym.totalRatings} opinii`
                                  : ''}
                              </p>
                            )}
                            {visibleGym.mapsUrl && (
                              <a
                                className="link text-primary text-sm inline-flex items-center gap-1"
                                href={visibleGym.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Otwórz w Mapach Google
                                <span>↗</span>
                              </a>
                            )}
                          </div>
                        </MapInfoWindow>
                      )}

                      {selectedPoi && (
                        <MapInfoWindow
                          position={selectedPoi.position}
                          onClose={() => setSelectedPoi(null)}
                          className="wt-map-info-window--poi"
                          zIndex={3}
                          media=
                            {selectedPoi.photoUrl ? (
                              <img
                                src={selectedPoi.photoUrl}
                                alt={selectedPoi.name}
                                className="h-32 w-full object-cover"
                              />
                            ) : undefined}
                        >
                          <div className="space-y-1">
                            <p className="font-semibold text-base text-slate-900">
                              {selectedPoi.name}
                            </p>
                            {selectedPoi.category && (
                              <p className="text-xs uppercase tracking-wide text-slate-500">
                                {selectedPoi.category}
                              </p>
                            )}
                            {selectedPoi.address && (
                              <p className="text-sm text-slate-600 leading-snug">
                                {selectedPoi.address}
                              </p>
                            )}
                            {(selectedPoi.rating || selectedPoi.totalRatings) && (
                              <p className="text-sm text-slate-600">
                                {selectedPoi.rating
                                  ? `Ocena ${selectedPoi.rating.toFixed(1)}`
                                  : 'Brak oceny'}
                                {selectedPoi.totalRatings
                                  ? ` • ${selectedPoi.totalRatings} opinii`
                                  : ''}
                              </p>
                            )}
                            {(selectedPoi.priceLevelText || selectedPoi.isOpenText) && (
                              <p className="text-xs text-slate-500">
                                {selectedPoi.isOpenText}
                                {selectedPoi.priceLevelText
                                  ? ` ${selectedPoi.isOpenText ? '• ' : ''}${selectedPoi.priceLevelText}`
                                  : ''}
                              </p>
                            )}
                            {selectedPoi.mapsUrl && (
                              <a
                                className="link text-primary text-sm inline-flex items-center gap-1"
                                href={selectedPoi.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Otwórz w Mapach Google
                                <span>↗</span>
                              </a>
                            )}
                          </div>
                        </MapInfoWindow>
                      )}

                      {mapMarkers.items.length === 0 && !isSearching && <></>}
                    </GoogleMap>
                  )}

                  {(isLocating || isPoiLoading) && isLoaded && !loadError && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2">
                      <div className="badge badge-outline gap-2 bg-base-100/90">
                        <span className="loading loading-spinner loading-xs" />
                        {isPoiLoading ? 'Ładuję szczegóły miejsca...' : 'Ustalam lokalizację...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="card bg-base-100 shadow-xl h-full">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title">Lista siłowni</h2>
                  <span className="badge badge-primary badge-outline">{gyms.length}</span>
                </div>

                {isSearching && (
                  <div className="alert alert-info">
                    <span>
                      Szukam obiektów w promieniu {searchRadius / 1000} km od centrum mapy...
                    </span>
                  </div>
                )}

                <div className="join w-full mb-4 sm:hidden">
                  {RADIUS_OPTIONS.map((radius) => (
                    <button
                      key={radius}
                      className={`join-item btn btn-sm ${
                        searchRadius === radius ? 'btn-primary' : 'btn-outline'
                      }`}
                      onClick={() => handleRadiusChange(radius)}
                      disabled={isSearching}
                    >
                      {radius / 1000} km
                    </button>
                  ))}
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
                  {gyms.map((gym) => (
                    <button
                      key={gym.id}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        selectedGymId === gym.id
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary hover:bg-primary/5'
                      }`}
                      onClick={() => handleListClick(gym)}
                    >
                      <p className="font-semibold text-base-content">{gym.name}</p>
                      {gym.address && (
                        <p className="text-sm text-base-content/70 mt-1">{gym.address}</p>
                      )}
                      {gym.distanceMeters !== undefined && (
                        <p className="text-xs text-base-content/60 mt-1">
                          ~{(gym.distanceMeters / 1000).toFixed(1)} km od centrum wyszukiwania
                        </p>
                      )}
                      {(gym.rating || gym.totalRatings) && (
                        <p className="text-xs text-base-content/60 mt-2">
                          {gym.rating ? `Ocena ${gym.rating.toFixed(1)}` : 'Brak oceny'}
                          {gym.totalRatings ? ` • ${gym.totalRatings} opinii` : ''}
                        </p>
                      )}
                      {gym.mapsUrl && (
                        <a
                          className="link link-primary text-sm mt-3 inline-flex items-center gap-1"
                          href={gym.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Otwórz w Mapach Google
                          <span>↗</span>
                        </a>
                      )}
                    </button>
                  ))}

                  {!isSearching && gyms.length === 0 && (
                    <div className="text-center py-12 text-base-content/60">
                      <p className="text-lg font-semibold">Brak wyników</p>
                      <p className="text-sm mt-2">
                        Przesuń mapę w inne miejsce i użyj opcji "Szukaj w tym obszarze".
                      </p>
                    </div>
                  )}
                </div>

                {mapMarkers.selected && (
                  <div className="mt-4 p-4 rounded-xl bg-base-200 text-base-content">
                    <p className="font-semibold text-lg">{mapMarkers.selected.name}</p>
                    {mapMarkers.selected.address && (
                      <p className="text-sm text-base-content/70 mt-1">
                        {mapMarkers.selected.address}
                      </p>
                    )}
                    {(mapMarkers.selected.rating || mapMarkers.selected.totalRatings) && (
                      <p className="text-xs text-base-content/60 mt-2">
                        {mapMarkers.selected.rating
                          ? `Ocena ${mapMarkers.selected.rating.toFixed(1)}`
                          : 'Brak oceny'}
                        {mapMarkers.selected.totalRatings
                          ? ` • ${mapMarkers.selected.totalRatings} opinii`
                          : ''}
                      </p>
                    )}
                    {mapMarkers.selected.mapsUrl && (
                      <a
                        className="link link-primary text-sm mt-3 inline-flex items-center gap-1"
                        href={mapMarkers.selected.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Otwórz w Mapach Google
                        <span>↗</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {isLocationPromptOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-xl">Użyj swojej lokalizacji</h3>
            <p className="py-4 text-base-content/70">
              Aby pokazać najbliższe siłownie, potrzebujemy dostępu do Twojej lokalizacji.
            </p>
            {locationPromptError && (
              <div className="alert alert-error mb-4">
                <span>{locationPromptError}</span>
              </div>
            )}
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={handleRequestLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Pobieram...
                  </>
                ) : (
                  'Pobierz moją lokalizację'
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleSkipLocationPrompt}
              >
                Pomiń
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" />
        </div>
      )}
    </div>
  )
}
