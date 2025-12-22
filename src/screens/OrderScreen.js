import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import useOrientation from '../utils/useOrientation';
import { loadMenu, loadCurrentOrder, saveCurrentOrder } from '../utils/storage';

export default function OrderScreen({ navigation }) {
  const { t, getCategoryName } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, isSmallScreen, numColumns, cardWidth } = useOrientation();
  
  const [menuItems, setMenuItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const categories = ['All', 'Breakfast', 'Rice', 'Curry', 'Snacks', 'Beverages'];

  // Dynamic calculations
  const safeBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const orderBarHeight = isLandscape ? 120 : 180;
  const bottomPadding = orderItems.length > 0 ? orderBarHeight + safeBottom + 20 : 20;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const menu = await loadMenu();
    setMenuItems(menu);
    const currentOrder = await loadCurrentOrder();
    setOrderItems(currentOrder);
  };

  const filteredMenu = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

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
      const newOrderItem = {
        orderId: orderItemId,
        id: menuItem.id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        image: menuItem.image,
      };
      updatedOrder = [...orderItems, newOrderItem];
    }
    
    setOrderItems(updatedOrder);
    await saveCurrentOrder(updatedOrder);
    setVariantModalVisible(false);
  };

  const removeFromOrder = async (orderItemId) => {
    const existingIndex = orderItems.findIndex(item => item.orderId === orderItemId);
    
    if (existingIndex >= 0) {
      const currentItem = orderItems[existingIndex];
      let updatedOrder;
      
      if (currentItem.quantity > 1) {
        updatedOrder = orderItems.map((item, index) => 
          index === existingIndex ? { ...item, quantity: item.quantity - 1 } : item
        );
      } else {
        updatedOrder = orderItems.filter((_, index) => index !== existingIndex);
      }
      
      setOrderItems(updatedOrder);
      await saveCurrentOrder(updatedOrder);
    }
  };

  const getQuantity = (menuItem) => {
    if (menuItem.hasVariants && menuItem.variants.length > 0) {
      return orderItems
        .filter(item => item.id === menuItem.id)
        .reduce((sum, item) => sum + item.quantity, 0);
    }
    const orderItemId = `${menuItem.id}-${menuItem.name}`;
    const item = orderItems.find(i => i.orderId === orderItemId);
    return item ? item.quantity : 0;
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const clearOrder = () => {
    Alert.alert(t('clearOrder'), t('clearConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clear'), style: 'destructive', onPress: async () => {
        setOrderItems([]);
        await saveCurrentOrder([]);
      }},
    ]);
  };

  const goToBill = () => {
    if (orderItems.length === 0) {
      Alert.alert(t('emptyOrder'), t('addItemsFirst'));
      return;
    }
    navigation.navigate('Bill');
  };

  // Dynamic styles
  const dynamicCardStyle = {
    width: cardWidth,
    margin: 5,
  };

  const dynamicImageHeight = isLandscape ? cardWidth * 0.5 : cardWidth * 0.65;

  const renderMenuItem = ({ item }) => {
    const quantity = getQuantity(item);
    
    return (
      <TouchableOpacity 
        style={[styles.menuCard, dynamicCardStyle]}
        onPress={() => handleItemClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image 
              source={{ uri: item.image }} 
              style={[styles.cardImage, { height: dynamicImageHeight }]} 
            />
          ) : (
            <View style={[styles.cardPlaceholder, { height: dynamicImageHeight }]}>
              <Text style={[styles.cardPlaceholderText, { fontSize: isLandscape ? 28 : 36 }]}>🍽️</Text>
            </View>
          )}
          
          {quantity > 0 && (
            <View style={[styles.quantityBadge, isLandscape && { width: 24, height: 24 }]}>
              <Text style={[styles.quantityBadgeText, isLandscape && { fontSize: 11 }]}>{quantity}</Text>
            </View>
          )}
          
          {item.hasVariants && item.variants.length > 0 && (
            <View style={styles.variantIndicator}>
              <Text style={styles.variantIndicatorText}>+{item.variants.length}</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardInfo, { padding: isLandscape ? 6 : 10 }]}>
          <Text 
            style={[styles.cardName, { fontSize: isLandscape ? 11 : 13, height: isLandscape ? 28 : 36 }]} 
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text style={[styles.cardPrice, { fontSize: isLandscape ? 14 : 17 }]}>
            ₹{item.price.toFixed(0)}
          </Text>
        </View>

        <View style={[styles.tapIndicator, { paddingVertical: isLandscape ? 5 : 8 }]}>
          <Text style={[styles.tapIndicatorText, { fontSize: isLandscape ? 10 : 12 }]}>Tap to add</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCartItem = (item) => (
    <View key={item.orderId} style={[styles.cartItem, isLandscape && { paddingVertical: 4 }]}>
      <View style={styles.cartItemInfo}>
        <Text style={[styles.cartItemName, isLandscape && { fontSize: 11 }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.cartItemPrice, isLandscape && { fontSize: 10 }]}>
          ₹{item.price} × {item.quantity}
        </Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity 
          style={[styles.cartControlBtn, isLandscape && { width: 24, height: 24 }]}
          onPress={() => removeFromOrder(item.orderId)}
        >
          <Text style={[styles.cartControlText, isLandscape && { fontSize: 14 }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.cartQuantity, isLandscape && { marginHorizontal: 8, fontSize: 12 }]}>
          {item.quantity}
        </Text>
        <TouchableOpacity 
          style={[styles.cartControlBtn, styles.cartControlBtnAdd, isLandscape && { width: 24, height: 24 }]}
          onPress={() => addToOrder({ id: item.id, image: item.image }, item.name, item.price)}
        >
          <Text style={[styles.cartControlText, { color: '#fff' }, isLandscape && { fontSize: 14 }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={[styles.categoryScroll, isLandscape && { maxHeight: 45 }]}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton, 
              selectedCategory === category && styles.categoryButtonActive,
              isLandscape && { paddingHorizontal: 12, paddingVertical: 6 }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText, 
              selectedCategory === category && styles.categoryTextActive,
              isLandscape && { fontSize: 11 }
            ]}>
              {getCategoryName(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu Grid */}
      <FlatList
        data={filteredMenu}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
        contentContainerStyle={{ padding: 5, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('noItemsAvailable')}</Text>}
      />

      {/* Order Summary Bar */}
      {orderItems.length > 0 && (
        <View style={[
          styles.orderBar, 
          { paddingBottom: safeBottom + 10 },
          isLandscape && { flexDirection: 'row', maxHeight: orderBarHeight }
        ]}>
          {/* Cart Items */}
          <ScrollView 
            style={[styles.cartScroll, isLandscape && { flex: 1, maxHeight: 80 }]}
            showsVerticalScrollIndicator={false}
            horizontal={isLandscape}
            showsHorizontalScrollIndicator={false}
          >
            {isLandscape ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {orderItems.map(item => (
                  <View key={item.orderId} style={styles.cartItemLandscape}>
                    <Text style={styles.cartItemNameLandscape} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.cartControlsLandscape}>
                      <TouchableOpacity 
                        style={styles.cartBtnLandscape}
                        onPress={() => removeFromOrder(item.orderId)}
                      >
                        <Text style={styles.cartBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.cartQtyLandscape}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={[styles.cartBtnLandscape, { backgroundColor: '#8B0000' }]}
                        onPress={() => addToOrder({ id: item.id, image: item.image }, item.name, item.price)}
                      >
                        <Text style={[styles.cartBtnText, { color: '#fff' }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              orderItems.map(item => renderCartItem(item))
            )}
          </ScrollView>

          {/* Total and Buttons */}
          <View style={[
            styles.orderFooter, 
            isLandscape && { 
              flexDirection: 'row', 
              alignItems: 'center', 
              paddingVertical: 8,
              borderTopWidth: 0,
              borderLeftWidth: 1,
              borderLeftColor: '#eee',
              paddingLeft: 15,
            }
          ]}>
            <View style={[styles.orderInfo, isLandscape && { marginBottom: 0, marginRight: 15 }]}>
              <Text style={[styles.orderCount, isLandscape && { fontSize: 12 }]}>
                {orderItems.reduce((sum, item) => sum + item.quantity, 0)} {t('items')}
              </Text>
              <Text style={[styles.orderTotal, isLandscape && { fontSize: 16 }]}>
                ₹{calculateTotal().toFixed(2)}
              </Text>
            </View>
            <View style={[styles.orderButtons, isLandscape && { flex: 0 }]}>
              <TouchableOpacity 
                style={[styles.clearButton, isLandscape && { paddingHorizontal: 15, paddingVertical: 8 }]} 
                onPress={clearOrder}
              >
                <Text style={[styles.clearButtonText, isLandscape && { fontSize: 12 }]}>{t('clear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.billButton, isLandscape && { paddingHorizontal: 20, paddingVertical: 8 }]} 
                onPress={goToBill}
              >
                <Text style={[styles.billButtonText, isLandscape && { fontSize: 12 }]}>{t('viewBillArrow')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Variant Selection Modal */}
      <Modal
        visible={variantModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVariantModalVisible(false)}
      >
        <View style={styles.variantModalOverlay}>
          <View style={[
            styles.variantModalContent, 
            { paddingBottom: safeBottom + 20 },
            isLandscape && { width: '60%', maxHeight: '90%' }
          ]}>
            {selectedItem && (
              <>
                <View style={styles.variantModalHeader}>
                  {selectedItem.image ? (
                    <Image 
                      source={{ uri: selectedItem.image }} 
                      style={[styles.variantModalImage, isLandscape && { width: 50, height: 50 }]} 
                    />
                  ) : (
                    <View style={[styles.variantModalImagePlaceholder, isLandscape && { width: 50, height: 50 }]}>
                      <Text style={{ fontSize: isLandscape ? 28 : 40 }}>🍽️</Text>
                    </View>
                  )}
                  <View style={styles.variantModalHeaderInfo}>
                    <Text style={[styles.variantModalTitle, isLandscape && { fontSize: 16 }]}>
                      {selectedItem.name}
                    </Text>
                    <Text style={styles.variantModalSubtitle}>Select a variant</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.variantOption, isLandscape && { padding: 12 }]}
                  onPress={() => addToOrder(selectedItem, selectedItem.name, selectedItem.price)}
                >
                  <Text style={styles.variantOptionName}>{selectedItem.name} (Regular)</Text>
                  <Text style={styles.variantOptionPrice}>₹{selectedItem.price}</Text>
                </TouchableOpacity>

                <ScrollView style={[styles.variantsList, isLandscape && { maxHeight: height * 0.4 }]}>
                  {selectedItem.variants.map((variant) => (
                    <TouchableOpacity 
                      key={variant.id}
                      style={[styles.variantOption, isLandscape && { padding: 12 }]}
                      onPress={() => addToOrder(selectedItem, variant.name, variant.price)}
                    >
                      <Text style={styles.variantOptionName}>{variant.name}</Text>
                      <Text style={styles.variantOptionPrice}>₹{variant.price}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity 
                  style={styles.variantCloseButton}
                  onPress={() => setVariantModalVisible(false)}
                >
                  <Text style={styles.variantCloseButtonText}>Cancel</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
  },
  categoryScroll: { 
    backgroundColor: '#fff', 
    maxHeight: 55,
  },
  categoryContent: { 
    paddingHorizontal: 10, 
    paddingVertical: 10, 
    alignItems: 'center',
  },
  categoryButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#f0f0f0', 
    marginRight: 8,
  },
  categoryButtonActive: { 
    backgroundColor: '#8B0000',
  },
  categoryText: { 
    color: '#666', 
    fontWeight: '600', 
    fontSize: 13,
  },
  categoryTextActive: { 
    color: '#fff',
  },
  
  // Menu Card
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    resizeMode: 'cover',
  },
  cardPlaceholder: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholderText: {},
  quantityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#8B0000',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  quantityBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  variantIndicator: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  variantIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardInfo: {},
  cardName: {
    fontWeight: '600',
    color: '#333',
  },
  cardPrice: {
    fontWeight: 'bold',
    color: '#8B0000',
    marginTop: 2,
  },
  tapIndicator: {
    backgroundColor: '#8B0000',
    alignItems: 'center',
  },
  tapIndicatorText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  emptyText: { 
    textAlign: 'center', 
    color: '#999', 
    marginTop: 50, 
    fontStyle: 'italic',
  },
  
  // Order Bar
  orderBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cartScroll: {
    maxHeight: 100,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartControlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartControlBtnAdd: {
    backgroundColor: '#8B0000',
  },
  cartControlText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  cartQuantity: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Landscape cart items
  cartItemLandscape: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
    minWidth: 120,
  },
  cartItemNameLandscape: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 5,
  },
  cartControlsLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnLandscape: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartQtyLandscape: {
    marginHorizontal: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  orderFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  orderInfo: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10,
  },
  orderCount: { 
    fontSize: 15, 
    color: '#666',
  },
  orderTotal: { 
    fontSize: 19, 
    fontWeight: 'bold', 
    color: '#8B0000',
  },
  orderButtons: { 
    flexDirection: 'row',
  },
  clearButton: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    alignItems: 'center', 
    marginRight: 10,
  },
  clearButtonText: { 
    color: '#666', 
    fontWeight: '600', 
    fontSize: 15,
  },
  billButton: { 
    flex: 2, 
    padding: 12, 
    borderRadius: 8, 
    backgroundColor: '#8B0000', 
    alignItems: 'center',
  },
  billButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 15,
  },
  
  // Variant Modal
  variantModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  variantModalHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  variantModalImage: {
    width: 65,
    height: 65,
    borderRadius: 12,
  },
  variantModalImagePlaceholder: {
    width: 65,
    height: 65,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantModalHeaderInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  variantModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  variantModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  variantsList: {
    maxHeight: 250,
  },
  variantOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
  },
  variantOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  variantOptionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  variantCloseButton: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  variantCloseButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});