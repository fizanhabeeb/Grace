// src/screens/OrderScreen.js
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Platform, 
  TextInput,
  ActivityIndicator,
  Alert,
  PermissionsAndroid // <--- REQUIRED FOR ANDROID PERMISSIONS
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import useOrientation from '../utils/useOrientation';
import { loadMenu, saveActiveTableOrder, getActiveTableOrder } from '../utils/storage';
import Fuse from 'fuse.js';
import Voice from '@react-native-voice/voice';

export default function OrderScreen({ navigation, route }) {
  const { t, getCategoryName, language } = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, numColumns, cardWidth, isTablet } = useOrientation();

  const { tableNo } = route.params || { tableNo: 'Counter' };
  
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // --- VOICE STATE ---
  const [isListening, setIsListening] = useState(false);

  const categories = ['All', 'Breakfast', 'Rice', 'Curry', 'Snacks', 'Beverages'];
  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const orderBarHeight = isLandscape ? 120 : 180;
  const bottomPadding = orderItems.length > 0 ? orderBarHeight + safeBottom + 20 : 20;

  // --- VOICE LIFECYCLE ---
  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = (e) => {
      console.log('Voice Error Object:', e);
      setIsListening(false);
      
      // --- DEBUGGING: SHOW EXACT ERROR CODE ---
      // This helps us identify if it's a Permission (5), Network (6), or No Match (7) error.
      const errorMsg = e.error ? e.error.message : 'Unknown Error';
      
      // Ignore common "No match" errors to avoid spamming the user
      if (errorMsg.includes('7') || errorMsg.includes('no match')) {
         // Do nothing, just stopped listening
      } else {
         Alert.alert('Voice Error', `Debug Code: ${JSON.stringify(e.error)}\n\nPlease try again.`);
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [menuItems, orderItems]); 

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [tableNo]) 
  );

  const loadData = async () => {
    const menu = await loadMenu();
    setMenuItems(menu);
    const currentOrder = await getActiveTableOrder(tableNo);
    setOrderItems(currentOrder);
  };

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchText(searchText); }, 300);
    return () => clearTimeout(handler);
  }, [searchText]);

  const fuse = useMemo(() => new Fuse(menuItems, {
    keys: ['name', 'category'],
    threshold: 0.3, 
  }), [menuItems]);

  const filteredMenu = useMemo(() => {
    let results = [];
    if (debouncedSearchText) {
      results = fuse.search(debouncedSearchText).map(result => result.item);
    } else {
      results = menuItems;
    }
    if (selectedCategory !== 'All') {
      results = results.filter(item => item.category === selectedCategory);
    }
    return results;
  }, [menuItems, selectedCategory, debouncedSearchText, fuse]);

  // --- VOICE HANDLERS ---
  
  const startListening = async () => {
    try {
      // 1. Destroy any old sessions first (Fixes Error 5)
      await Voice.destroy(); 
      setIsListening(false);

      // 2. Explicitly ask for Android Permission
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message: "We need access to your microphone to take voice orders.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission Denied", "Voice ordering cannot work without microphone access.");
          return;
        }
      }

      // 3. Start Listening
      setIsListening(true);
      const locale = language === 'ml' ? 'ml-IN' : 'en-IN'; 
      await Voice.start(locale);
      
    } catch (e) {
      console.error(e);
      setIsListening(false);
      Alert.alert("Error", "Could not start microphone.");
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error(e);
    }
  };

  const onSpeechResults = (e) => {
    const text = e.value && e.value[0] ? e.value[0] : '';
    if (text) {
      processVoiceCommand(text);
    }
    stopListening();
  };

  // --- INTELLIGENT VOICE PARSER ---
  const processVoiceCommand = async (text) => {
    const numberMap = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'ഒന്ന്': 1, 'രണ്ട്': 2, 'മൂന്ന്': 3, 'നാല്': 4, 'അഞ്ച്': 5,
      'ആറ്': 6, 'ഏഴ്': 7, 'എട്ട്': 8, 'ഒമ്പത്': 9, 'പത്ത്': 10,
      'ഒരു': 1, 
    };

    let normalized = text.toLowerCase();
    Object.keys(numberMap).forEach(key => {
      normalized = normalized.replace(new RegExp(`\\b${key}\\b`, 'g'), numberMap[key]);
    });

    // Split by common separators (English "and", Malayalam "pinne", Comma)
    const segments = normalized.split(/,| and | പിന്നെ | with /);
    let itemsAdded = 0;
    const newItemsToAdd = [];

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      const numberMatch = trimmed.match(/(\d+)/);
      const quantity = numberMatch ? parseInt(numberMatch[0]) : 1;
      const query = trimmed.replace(/\d+/, '').trim();

      if (query.length > 2) {
        const results = fuse.search(query);
        // Ensure strict matching to avoid wrong items
        if (results.length > 0 && results[0].score < 0.4) {
          const match = results[0].item;
          newItemsToAdd.push({ item: match, qty: quantity });
          itemsAdded++;
        }
      }
    }

    if (itemsAdded > 0) {
      let currentOrderList = [...orderItems]; 
      
      for (const { item, qty } of newItemsToAdd) {
        if (item.hasVariants) {
           Alert.alert('Variant Required', `Please manually select variant for ${item.name}`);
           continue; 
        }

        const orderItemId = `${item.id}-${item.name}`;
        const existingIndex = currentOrderList.findIndex(i => i.orderId === orderItemId);

        if (existingIndex >= 0) {
          currentOrderList[existingIndex].quantity += qty;
        } else {
          currentOrderList.push({
            orderId: orderItemId,
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: qty,
            image: item.image,
          });
        }
      }

      setOrderItems(currentOrderList);
      await saveActiveTableOrder(tableNo, currentOrderList);
      Alert.alert('Voice Order', `Added ${itemsAdded} item(s) to the cart.`);
    } else {
      Alert.alert('Not Found', `Could not find items matching "${text}"`);
    }
  };

  // --- EXISTING ORDER LOGIC ---
  const handleItemClick = (menuItem) => {
    if (menuItem.hasVariants && menuItem.variants.length > 0) {
      setSelectedItem(menuItem);
      setVariantModalVisible(true);
    } else {
      addToOrder(menuItem, menuItem.name, menuItem.price);
    }
  };

  const addToOrder = async (menuItem, itemName, itemPrice) => {
    const orderItemId = `${menuItem.id}-${itemName}`;
    const existingIndex = orderItems.findIndex(item => item.orderId === orderItemId);
    
    let updatedOrder;
    if (existingIndex >= 0) {
      updatedOrder = orderItems.map((item, index) => 
        index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedOrder = [...orderItems, {
        orderId: orderItemId,
        id: menuItem.id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        image: menuItem.image,
      }];
    }
    setOrderItems(updatedOrder);
    await saveActiveTableOrder(tableNo, updatedOrder);
    setVariantModalVisible(false);
  };

  const removeFromOrder = async (orderItemId) => {
    const existingIndex = orderItems.findIndex(item => item.orderId === orderItemId);
    if (existingIndex >= 0) {
      const currentItem = orderItems[existingIndex];
      let updatedOrder = currentItem.quantity > 1 
        ? orderItems.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity - 1 } : item)
        : orderItems.filter((_, index) => index !== existingIndex);
      setOrderItems(updatedOrder);
      await saveActiveTableOrder(tableNo, updatedOrder);
    }
  };

  const getQuantity = (menuItem) => {
    if (menuItem.hasVariants) {
      return orderItems.filter(item => item.id === menuItem.id).reduce((sum, item) => sum + item.quantity, 0);
    }
    const item = orderItems.find(i => i.orderId === `${menuItem.id}-${menuItem.name}`);
    return item ? item.quantity : 0;
  };

  const renderMenuItem = ({ item }) => {
    const quantity = getQuantity(item);
    const dynamicImageHeight = isLandscape ? cardWidth * 0.5 : cardWidth * 0.65;
    
    return (
      <TouchableOpacity 
        style={[styles.menuCard, { width: cardWidth, margin: 5, backgroundColor: theme.card }]}
        onPress={() => handleItemClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={[styles.cardImage, { height: dynamicImageHeight }]} />
          ) : (
            <View style={[styles.cardPlaceholder, { height: dynamicImageHeight, backgroundColor: theme.inputBackground }]}>
              <Text style={{ fontSize: isLandscape ? 28 : 36 }}>🍽️</Text>
            </View>
          )}
          {quantity > 0 && (
            <View style={[styles.quantityBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.quantityBadgeText}>{quantity}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.text, fontSize: isTablet ? 16 : 13 }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardPrice, { color: theme.primary, fontSize: isTablet ? 16 : 14 }]}>₹{item.price.toFixed(0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Search Bar with Table Info */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
           <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>Table: {tableNo}</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
             <Text style={{ color: theme.textSecondary }}>Close</Text>
           </TouchableOpacity>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Search Input */}
            <View style={[styles.searchWrapper, { backgroundColor: theme.inputBackground, flex: 1 }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={t('enterItemName')}
                    placeholderTextColor={theme.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText} 
                />
                {searchText !== '' && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* VOICE BUTTON */}
            <TouchableOpacity 
                onPress={isListening ? stopListening : startListening}
                style={[styles.voiceBtn, { backgroundColor: isListening ? '#ff4444' : theme.primary }]}
            >
                {isListening ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Ionicons name="mic" size={24} color="#fff" />
                )}
            </TouchableOpacity>
        </View>
      </View>

      {/* Category List */}
      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryButton, selectedCategory === category ? { backgroundColor: theme.primary } : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, { color: selectedCategory === category ? '#fff' : theme.text }]}>{getCategoryName(category)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid List */}
      <FlatList
        data={filteredMenu}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        key={numColumns} 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.textSecondary }]}>{debouncedSearchText ? "No matches found" : t('noItemsAvailable')}</Text>}
      />

      {/* Cart Summary Bar */}
      {orderItems.length > 0 && (
        <View style={[styles.orderBar, { paddingBottom: safeBottom + 10, backgroundColor: theme.card, borderColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {orderItems.map(item => (
              <View key={item.orderId} style={[styles.cartItem, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.cartItemName, { color: theme.text }]}>{item.name} x{item.quantity}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => removeFromOrder(item.orderId)} style={[styles.smallBtn, { backgroundColor: theme.card }]}><Text style={{ color: theme.text }}>−</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => addToOrder({ id: item.id, image: item.image }, item.name, item.price)} style={[styles.smallBtn, { backgroundColor: theme.card }]}><Text style={{ color: theme.text }}>+</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={[styles.billButton, { backgroundColor: theme.primary }]} 
            onPress={() => navigation.navigate('Bill', { tableNo: tableNo })}
          >
            <Text style={styles.billButtonText}>{t('viewBillArrow')} (₹{orderItems.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Variant Modal */}
      <Modal visible={variantModalVisible} animationType="slide" transparent={true}>
          <View style={styles.variantModalOverlay}>
              <View style={[styles.variantModalContent, { backgroundColor: theme.card }]}>
                  {selectedItem && (
                      <>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedItem.name}</Text>
                        <TouchableOpacity style={[styles.variantOption, { borderBottomColor: theme.border }]} onPress={() => addToOrder(selectedItem, selectedItem.name, selectedItem.price)}>
                            <Text style={{ color: theme.text }}>{selectedItem.name} (Regular)</Text>
                            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>₹{selectedItem.price}</Text>
                        </TouchableOpacity>
                        {selectedItem.variants.map(v => (
                            <TouchableOpacity key={v.id} style={[styles.variantOption, { borderBottomColor: theme.border }]} onPress={() => addToOrder(selectedItem, v.name, v.price)}>
                                <Text style={{ color: theme.text }}>{v.name}</Text>
                                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>₹{v.price}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setVariantModalVisible(false)} style={styles.closeBtn}>
                            <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                  )}
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: { padding: 10, borderBottomWidth: 1 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, height: 40 },
  searchInput: { flex: 1, fontSize: 14 },
  categoryContent: { paddingHorizontal: 10, alignItems: 'center' },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryText: { fontWeight: '600' },
  menuCard: { borderRadius: 12, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: '100%', resizeMode: 'cover' },
  cardPlaceholder: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  quantityBadge: { position: 'absolute', top: 5, right: 5, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  quantityBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardInfo: { padding: 8 },
  cardName: { fontSize: 13, fontWeight: 'bold' },
  cardPrice: { marginTop: 2, fontWeight: 'bold' },
  orderBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 10 },
  cartItem: { padding: 8, borderRadius: 8, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  cartItemName: { marginRight: 8, fontSize: 12 },
  smallBtn: { padding: 5, borderRadius: 5, marginLeft: 5 },
  billButton: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  billButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50 },
  variantModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  variantModalContent: { borderRadius: 20, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  variantOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1 },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3
  }
});