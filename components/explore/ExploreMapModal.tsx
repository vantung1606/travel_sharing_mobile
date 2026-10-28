import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Text } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import { PlaceItem, placeApi } from '@/src/services/api';

interface ExploreMapModalProps {
  visible: boolean;
  places?: PlaceItem[];
  onClose: () => void;
  onOpenPlaceDetail: (place: PlaceItem) => void;
}

const CATEGORY_CHIPS = [
  { key: 'all', label: 'Tất cả', icon: 'compass' },
  { key: 'cafe', label: 'Cà phê / Check-in', icon: 'coffee' },
  { key: 'hotel', label: 'Khách sạn / Homestay', icon: 'bed' },
  { key: 'food', label: 'Ẩm thực', icon: 'cutlery' },
  { key: 'history', label: 'Di tích / Lịch sử', icon: 'university' },
  { key: 'nature', label: 'Thiên nhiên', icon: 'tree' },
  { key: 'adventure', label: 'Trải nghiệm', icon: 'ticket' },
];

function getCategoryColorAndEmoji(category: string, name: string): { color: string; emoji: string } {
  const cat = `${category} ${name}`.toLowerCase();
  if (cat.includes('cafe') || cat.includes('cà phê') || cat.includes('trà') || cat.includes('săn mây')) {
    return { color: '#d97706', emoji: '☕' };
  }
  if (cat.includes('homestay') || cat.includes('khách sạn') || cat.includes('resort') || cat.includes('nghỉ dưỡng') || cat.includes('villa')) {
    return { color: '#e11d48', emoji: '🏡' };
  }
  if (cat.includes('ẩm thực') || cat.includes('ăn uống') || cat.includes('nhà hàng') || cat.includes('quán ăn') || cat.includes('đặc sản')) {
    return { color: '#ea580c', emoji: '🍜' };
  }
  if (cat.includes('trải nghiệm') || cat.includes('vui chơi') || cat.includes('trekking') || cat.includes('leo núi') || cat.includes('tour')) {
    return { color: '#7c3aed', emoji: '🧗' };
  }
  if (cat.includes('biển') || cat.includes('đảo') || cat.includes('vịnh') || cat.includes('bãi tắm')) {
    return { color: '#0891b2', emoji: '🏖️' };
  }
  if (cat.includes('di tích') || cat.includes('chùa') || cat.includes('tháp') || cat.includes('lăng') || cat.includes('bảo tàng') || cat.includes('phố cổ') || cat.includes('lịch sử')) {
    return { color: '#b91c1c', emoji: '🏛️' };
  }
  if (cat.includes('thác') || cat.includes('núi') || cat.includes('rừng') || cat.includes('đèo') || cat.includes('hồ') || cat.includes('thung lũng') || cat.includes('thiên nhiên')) {
    return { color: '#16a34a', emoji: '🏔️' };
  }
  return { color: '#ef4444', emoji: '📸' };
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const RNWebView: any = WebView;

export function ExploreMapModal({
  visible,
  places: propPlaces,
  onClose,
  onOpenPlaceDetail,
}: ExploreMapModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);

  const [allPlaces, setAllPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  // Nạp 100% dữ liệu thực từ MySQL
  useEffect(() => {
    if (!visible) {
      setSelectedPlace(null);
      return;
    }

    if (propPlaces && propPlaces.length > 0) {
      setAllPlaces(propPlaces);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    placeApi
      .getAllPlaces()
      .then((data) => {
        if (!isMounted) return;
        const valid = (data || []).filter((p) => p.latitude != null && p.longitude != null);
        setAllPlaces(valid.length > 0 ? valid : data || []);
      })
      .catch((err) => {
        console.warn('Lỗi nạp địa điểm bản đồ:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, propPlaces]);

  // Lọc địa điểm theo category và search
  const filteredPlaces = useMemo(() => {
    return allPlaces.filter((p) => {
      // Tọa độ hợp lệ
      const hasCoords = p.latitude != null && p.longitude != null && !isNaN(p.latitude) && !isNaN(p.longitude);
      if (!hasCoords) return false;

      // Lọc category
      if (selectedCategory !== 'all') {
        const cat = `${p.category || ''} ${p.name || ''}`.toLowerCase();
        if (selectedCategory === 'cafe' && !cat.includes('cafe') && !cat.includes('cà phê') && !cat.includes('trà')) return false;
        if (selectedCategory === 'hotel' && !cat.includes('homestay') && !cat.includes('khách sạn') && !cat.includes('resort') && !cat.includes('villa')) return false;
        if (selectedCategory === 'food' && !cat.includes('ẩm thực') && !cat.includes('ăn uống') && !cat.includes('nhà hàng') && !cat.includes('quán')) return false;
        if (selectedCategory === 'history' && !cat.includes('di tích') && !cat.includes('chùa') && !cat.includes('tháp') && !cat.includes('lăng') && !cat.includes('bảo tàng') && !cat.includes('lịch sử')) return false;
        if (selectedCategory === 'nature' && !cat.includes('thác') && !cat.includes('núi') && !cat.includes('rừng') && !cat.includes('đèo') && !cat.includes('hồ') && !cat.includes('thiên nhiên') && !cat.includes('biển')) return false;
        if (selectedCategory === 'adventure' && !cat.includes('trải nghiệm') && !cat.includes('vui chơi') && !cat.includes('trekking') && !cat.includes('tour')) return false;
      }

      // Lọc search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCity = (p.city || '').toLowerCase().includes(q);
        const matchAddress = (p.address || '').toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchAddress) return false;
      }

      return true;
    });
  }, [allPlaces, selectedCategory, searchQuery]);

  // Định vị GPS hiện tại của người dùng (Task #24)
  const handleLocateMe = async () => {
    try {
      setLocating(true);
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        showToast({
          kind: 'info',
          title: 'Cần quyền truy cập vị trí',
          message: 'Vui lòng cấp quyền vị trí GPS để tìm địa điểm du lịch quanh bạn.',
        });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });

      // Gửi lệnh phóng to vào vị trí GPS trên WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.setUserGpsLocation) {
            window.setUserGpsLocation(${latitude}, ${longitude});
          }
          true;
        `);
      }

      // Đếm số địa điểm gần trong bán kính 30km
      const nearbyCount = allPlaces.filter((p) => {
        if (p.latitude == null || p.longitude == null) return false;
        const dist = calculateDistanceKm(latitude, longitude, p.latitude, p.longitude);
        return dist <= 30;
      }).length;

      showToast({
        kind: 'success',
        title: 'Đã định vị vị trí của bạn 📍',
        message: nearbyCount > 0
          ? `Tìm thấy ${nearbyCount} địa điểm du lịch trong bán kính 30km quanh bạn.`
          : 'Đã di chuyển bản đồ đến vị trí hiện tại của bạn.',
      });
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Lỗi định vị GPS',
        message: err?.message || 'Không thể lấy tọa độ vị trí hiện tại của thiết bị.',
      });
    } finally {
      setLocating(false);
    }
  };

  // Cập nhật Markers trên WebView khi danh sách lọc thay đổi
  useEffect(() => {
    if (!webViewRef.current) return;
    const placesJson = JSON.stringify(
      filteredPlaces.map((p) => {
        const { color, emoji } = getCategoryColorAndEmoji(p.category || '', p.name);
        return {
          id: p.id,
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
          city: p.city || 'Việt Nam',
          rating: p.rating || 0,
          color,
          emoji,
        };
      })
    );

    webViewRef.current.injectJavaScript(`
      if (window.updatePlacesMarkers) {
        window.updatePlacesMarkers(${placesJson});
      }
      true;
    `);
  }, [filteredPlaces]);

  // Xử lý thông điệp từ Leaflet gửi về React Native
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_PLACE') {
        const found = allPlaces.find((p) => p.id === data.placeId);
        if (found) {
          setSelectedPlace(found);
        }
      } else if (data.type === 'NAVIGATE') {
        const found = allPlaces.find((p) => p.id === data.placeId);
        if (found) {
          handleOpenDirection(found);
        }
      }
    } catch (e) {
      console.warn('Lỗi xử lý message từ WebView:', e);
    }
  };

  // Chỉ đường Google Maps từng bước
  const handleOpenDirection = async (place: PlaceItem) => {
    const hasCoords = place.latitude != null && place.longitude != null;
    const dest = hasCoords
      ? `${place.latitude},${place.longitude}`
      : encodeURIComponent([place.name, place.address, place.city].filter(Boolean).join(', '));
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch {
      showToast({
        kind: 'error',
        title: 'Không mở được bản đồ',
        message: 'Thiết bị không mở được ứng dụng Google Maps.',
      });
    }
  };

  // HTML Leaflet đồng bộ thiết kế Web
  const leafletHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          html, body, #map { width: 100%; height: 100%; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .leaflet-control-attribution { display: none !important; }
          .sleek-pin-wrapper { display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.18s ease; }
          .sleek-pin-wrapper:active { transform: scale(1.18); }
          .pin-emoji { position: absolute; top: 6px; font-size: 13px; line-height: 1; pointer-events: none; }
          .gps-radar-beacon { display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .gps-pulse { width: 34px; height: 34px; border-radius: 50%; background: rgba(59, 130, 246, 0.28); display: flex; align-items: center; justify-content: center; animation: pulse 1.8s infinite; }
          .gps-dot { width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
          @keyframes pulse { 0% { transform: scale(0.8); opacity: 0.9; } 50% { transform: scale(1.3); opacity: 0.4; } 100% { transform: scale(0.8); opacity: 0.9; } }
          .gps-tag { background: #1d4ed8; color: #ffffff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; margin-bottom: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.8); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            center: [16.0544, 108.2022], // Tâm Việt Nam (Đà Nẵng)
            zoom: 6
          });

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var markersGroup = L.layerGroup().addTo(map);
          var userGpsMarker = null;

          function createPinHtml(color, emoji) {
            return '<div class="sleek-pin-wrapper" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">' +
              '<svg width="30" height="38" viewBox="0 0 28 36" fill="none">' +
                '<path d="M14 0C6.268 0 0 6.268 0 14C0 22.8 14 36 14 36C14 36 28 22.8 28 14C28 6.268 21.732 0 14 0Z" fill="' + color + '"/>' +
                '<path d="M14 1C6.82 1 1 6.82 1 14C1 22.1 13.5 34.5 14 35C14.5 34.5 27 22.1 27 14C27 6.82 21.18 1 14 1Z" stroke="#ffffff" stroke-width="1.8"/>' +
                '<circle cx="14" cy="14" r="9.5" fill="#ffffff"/>' +
              '</svg>' +
              '<span class="pin-emoji">' + emoji + '</span>' +
            '</div>';
          }

          window.updatePlacesMarkers = function(placesList) {
            markersGroup.clearLayers();
            if (!placesList || !placesList.length) return;

            var bounds = [];
            placesList.forEach(function(p) {
              if (p.lat == null || p.lng == null) return;
              var icon = L.divIcon({
                className: '',
                html: createPinHtml(p.color, p.emoji),
                iconSize: [30, 38],
                iconAnchor: [15, 38],
                popupAnchor: [0, -38]
              });

              var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(markersGroup);
              bounds.push([p.lat, p.lng]);

              m.on('click', function() {
                map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SELECT_PLACE',
                    placeId: p.id
                  }));
                }
              });
            });

            if (bounds.length > 0 && !window.hasFittedBounds) {
              window.hasFittedBounds = true;
              map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
            }
          };

          window.setUserGpsLocation = function(lat, lng) {
            if (userGpsMarker) {
              userGpsMarker.setLatLng([lat, lng]);
            } else {
              var gpsIcon = L.divIcon({
                className: '',
                html: '<div class="gps-radar-beacon">' +
                  '<div class="gps-tag">📍 Bạn ở đây</div>' +
                  '<div class="gps-pulse"><div class="gps-dot"></div></div>' +
                '</div>',
                iconSize: [40, 50],
                iconAnchor: [20, 40]
              });
              userGpsMarker = L.marker([lat, lng], { icon: gpsIcon, zIndexOffset: 1000 }).addTo(map);
            }
            map.flyTo([lat, lng], 14, { duration: 1.2 });
          };
        </script>
      </body>
      </html>
    `;
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} accessibilityLabel="Đóng bản đồ">
            <FontAwesome name="chevron-left" size={16} color={WF_PAPER.inkPrimary} />
          </TouchableOpacity>

          <View style={styles.searchWrapper}>
            <FontAwesome name="search" size={13} color={WF_PAPER.inkMuted} style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Tìm kiếm địa danh trên bản đồ..."
              placeholderTextColor={WF_PAPER.inkMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <FontAwesome name="times-circle" size={14} color={WF_PAPER.inkMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.gpsBtn, locating && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={handleLocateMe}
            disabled={locating}
            accessibilityLabel="Vị trí của tôi">
            {locating ? (
              <ActivityIndicator size="small" color="#FFFDF8" />
            ) : (
              <FontAwesome name="location-arrow" size={15} color="#FFFDF8" />
            )}
          </TouchableOpacity>
        </View>

        {/* Category Horizontal Filter Chips */}
        <View style={styles.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORY_CHIPS.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(cat.key)}>
                  <FontAwesome
                    name={cat.icon as any}
                    size={11}
                    color={active ? '#FFFDF8' : WF_PAPER.inkSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.mapLoadingText}>Đang nạp tọa độ du lịch vệ tinh...</Text>
            </View>
          ) : null}

          <RNWebView
            ref={webViewRef}
            source={{ html: leafletHtml }}
            style={styles.webView}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            geolocationEnabled={true}
            onMessage={handleWebViewMessage}
            onLoadEnd={() => {
              // Gửi danh sách ban đầu khi WebView load xong
              const placesJson = JSON.stringify(
                filteredPlaces.map((p) => {
                  const { color, emoji } = getCategoryColorAndEmoji(p.category || '', p.name);
                  return {
                    id: p.id,
                    name: p.name,
                    lat: p.latitude,
                    lng: p.longitude,
                    city: p.city || 'Việt Nam',
                    rating: p.rating || 0,
                    color,
                    emoji,
                  };
                })
              );
              webViewRef.current?.injectJavaScript(`
                if (window.updatePlacesMarkers) {
                  window.updatePlacesMarkers(${placesJson});
                }
                true;
              `);
            }}
          />

          {/* Floating Place Counter Badge */}
          <View style={styles.floatingBadge}>
            <FontAwesome name="map-marker" size={11} color={WF_COLORS.primary} style={{ marginRight: 5 }} />
            <Text style={styles.floatingBadgeText}>
              {filteredPlaces.length} địa điểm
            </Text>
          </View>

          {/* Floating Bottom Card for Selected Place */}
          {selectedPlace ? (
            <View style={styles.calloutCard}>
              <View style={styles.calloutHeader}>
                <View style={styles.calloutTagRow}>
                  {selectedPlace.category ? (
                    <View style={styles.calloutCategoryTag}>
                      <Text style={styles.calloutCategoryText}>{selectedPlace.category}</Text>
                    </View>
                  ) : null}
                  <View style={styles.calloutCityTag}>
                    <FontAwesome name="map-marker" size={9} color={WF_COLORS.primary} style={{ marginRight: 3 }} />
                    <Text style={styles.calloutCityText}>{selectedPlace.city || 'Việt Nam'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedPlace(null)} style={styles.calloutCloseBtn}>
                  <FontAwesome name="times" size={14} color={WF_PAPER.inkMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.calloutBodyRow}>
                {selectedPlace.images && selectedPlace.images.length > 0 ? (
                  <Image source={{ uri: selectedPlace.images[0] }} style={styles.calloutThumb} />
                ) : (
                  <View style={[styles.calloutThumb, styles.calloutThumbFallback]}>
                    <FontAwesome name="camera" size={18} color="#D9CDBE" />
                  </View>
                )}

                <View style={styles.calloutInfo}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {selectedPlace.name}
                  </Text>
                  <View style={styles.calloutRatingRow}>
                    <FontAwesome name="star" size={11} color={WF_COLORS.amber} style={{ marginRight: 4 }} />
                    <Text style={styles.calloutRatingText}>
                      {selectedPlace.rating ? selectedPlace.rating.toFixed(1) : 'Mới'}
                    </Text>
                    <Text style={styles.calloutReviewsCount}>
                      {selectedPlace.reviewsCount ? `(${selectedPlace.reviewsCount} đánh giá)` : ''}
                    </Text>
                  </View>
                  <Text style={styles.calloutAddress} numberOfLines={1}>
                    {selectedPlace.address || `${selectedPlace.city}, Việt Nam`}
                  </Text>
                </View>
              </View>

              <View style={styles.calloutActionsRow}>
                <TouchableOpacity
                  style={styles.calloutDirectionBtn}
                  activeOpacity={0.85}
                  onPress={() => handleOpenDirection(selectedPlace)}>
                  <FontAwesome name="location-arrow" size={12} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.calloutDirectionText}>Chỉ đường</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.calloutDetailBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    const target = selectedPlace;
                    setSelectedPlace(null);
                    onOpenPlaceDetail(target);
                  }}>
                  <Text style={styles.calloutDetailText}>Xem chi tiết</Text>
                  <FontAwesome name="arrow-right" size={11} color="#FFFDF8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_PAPER.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: WF_PAPER.card,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_PAPER.pillBg,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    backgroundColor: WF_PAPER.pillBg,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
    paddingVertical: 0,
  },
  gpsBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterWrap: {
    backgroundColor: WF_PAPER.card,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
  },
  categoryScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFDF8',
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: WF_PAPER.inkMuted,
  },
  floatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  floatingBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  calloutCard: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calloutTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calloutCategoryTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  calloutCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  calloutCityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  calloutCityText: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  calloutCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  calloutBodyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  calloutThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  calloutThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  calloutRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  calloutRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  calloutReviewsCount: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
  },
  calloutAddress: {
    fontSize: 11,
    color: '#6B7280',
  },
  calloutActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calloutDirectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calloutDirectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  calloutDetailBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: WF_COLORS.primary,
  },
  calloutDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDF8',
  },
});
