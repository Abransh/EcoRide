/**
 * Component: PaymentFeature
 * Purpose: Payment method selection and fare breakdown for ride booking
 * Props: 
 *   - onPaymentMethodSelect: Function called when payment method is selected
 *   - selectedPaymentMethod: Currently selected payment method
 *   - fareEstimate: Fare estimate data from API
 * Dependencies: SimulatedApi, SharedComponents
 * Data Flow: Shows payment options, fare breakdown, and handles payment selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoCard, EcoButton, EcoInput } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';
import { getPaymentMethods, addPaymentMethod } from '../../../shared/api/simulatedApi';

const PaymentFeature = ({
  onPaymentMethodSelect,
  selectedPaymentMethod,
  fareEstimate,
}) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardData, setNewCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  /**
   * Load user's saved payment methods
   */
  const loadPaymentMethods = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const result = await getPaymentMethods(user.id);
        
        if (result.success) {
          setPaymentMethods(result.paymentMethods);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  /**
   * Handle payment method selection
   */
  const handlePaymentMethodSelect = (paymentMethod) => {
    onPaymentMethodSelect(paymentMethod);
  };

  /**
   * Handle adding new payment method
   */
  const handleAddPaymentMethod = async () => {
    if (!newCardData.cardNumber || !newCardData.expiryDate || !newCardData.cvv || !newCardData.cardholderName) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }

    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const result = await addPaymentMethod(user.id, {
          ...newCardData,
          type: 'card',
        });
        
        if (result.success) {
          setPaymentMethods(prev => [...prev, result.paymentMethod]);
          setShowAddCard(false);
          setNewCardData({
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardholderName: '',
          });
          Alert.alert('Success', 'Payment method added successfully');
        }
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'Failed to add payment method');
    }
  };

  /**
   * Format card number for display
   */
  const formatCardNumber = (cardNumber) => {
    return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  /**
   * Get card icon based on card number
   */
  const getCardIcon = (cardNumber) => {
    const firstDigit = cardNumber.charAt(0);
    switch (firstDigit) {
      case '4':
        return 'credit-card'; // Visa
      case '5':
        return 'credit-card'; // Mastercard
      default:
        return 'credit-card';
    }
  };

  /**
   * Calculate fare breakdown
   */
  const renderFareBreakdown = () => {
    if (!fareEstimate) return null;

    return (
      <EcoCard style={styles.fareBreakdownCard}>
        <Text style={styles.fareBreakdownTitle}>Fare Breakdown</Text>
        
        <View style={styles.fareItem}>
          <Text style={styles.fareLabel}>Base Fare</Text>
          <Text style={styles.fareValue}>${fareEstimate.baseFare}</Text>
        </View>
        
        <View style={styles.fareItem}>
          <Text style={styles.fareLabel}>Distance ({fareEstimate.distance} km)</Text>
          <Text style={styles.fareValue}>${fareEstimate.distanceFare}</Text>
        </View>
        
        <View style={styles.fareItem}>
          <Text style={styles.fareLabel}>Time ({fareEstimate.duration} mins)</Text>
          <Text style={styles.fareValue}>${fareEstimate.timeFare}</Text>
        </View>
        
        {fareEstimate.surcharge > 0 && (
          <View style={styles.fareItem}>
            <Text style={styles.fareLabel}>Peak Time Surcharge</Text>
            <Text style={styles.fareValue}>${fareEstimate.surcharge}</Text>
          </View>
        )}
        
        <View style={[styles.fareItem, styles.fareTotal]}>
          <Text style={styles.fareTotalLabel}>Total</Text>
          <Text style={styles.fareTotalValue}>${fareEstimate.total}</Text>
        </View>
        
        <View style={styles.ecoDiscount}>
          <Icon name="eco" size={16} color={Colors.success} />
          <Text style={styles.ecoDiscountText}>
            5% eco-discount applied for choosing green transport!
          </Text>
        </View>
      </EcoCard>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Choose Payment Method</Text>
      
      {/* Fare Breakdown */}
      {renderFareBreakdown()}

      {/* Payment Methods */}
      <View style={styles.paymentMethodsContainer}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        
        {/* Saved Payment Methods */}
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethodCard,
              selectedPaymentMethod?.id === method.id && styles.selectedPaymentMethod,
            ]}
            onPress={() => handlePaymentMethodSelect(method)}
          >
            <EcoCard style={styles.paymentMethodCardInner}>
              <View style={styles.paymentMethodInfo}>
                <Icon
                  name={getCardIcon(method.cardNumber)}
                  size={24}
                  color={selectedPaymentMethod?.id === method.id ? Colors.primary : Colors.textSecondary}
                />
                <View style={styles.paymentMethodDetails}>
                  <Text style={[
                    styles.paymentMethodName,
                    selectedPaymentMethod?.id === method.id && styles.selectedText
                  ]}>
                    {method.type === 'card' 
                      ? `**** **** **** ${method.cardNumber.slice(-4)}`
                      : method.type.toUpperCase()
                    }
                  </Text>
                  <Text style={styles.paymentMethodSubtext}>
                    {method.type === 'card' 
                      ? `Expires ${method.expiryDate}`
                      : method.description
                    }
                  </Text>
                </View>
              </View>
              {selectedPaymentMethod?.id === method.id && (
                <Icon name="check-circle" size={24} color={Colors.primary} />
              )}
            </EcoCard>
          </TouchableOpacity>
        ))}

        {/* Cash Payment Option */}
        <TouchableOpacity
          style={[
            styles.paymentMethodCard,
            selectedPaymentMethod?.type === 'cash' && styles.selectedPaymentMethod,
          ]}
          onPress={() => handlePaymentMethodSelect({ type: 'cash', id: 'cash' })}
        >
          <EcoCard style={styles.paymentMethodCardInner}>
            <View style={styles.paymentMethodInfo}>
              <Icon
                name="payments"
                size={24}
                color={selectedPaymentMethod?.type === 'cash' ? Colors.primary : Colors.textSecondary}
              />
              <View style={styles.paymentMethodDetails}>
                <Text style={[
                  styles.paymentMethodName,
                  selectedPaymentMethod?.type === 'cash' && styles.selectedText
                ]}>
                  Cash Payment
                </Text>
                <Text style={styles.paymentMethodSubtext}>
                  Pay directly to the driver
                </Text>
              </View>
            </View>
            {selectedPaymentMethod?.type === 'cash' && (
              <Icon name="check-circle" size={24} color={Colors.primary} />
            )}
          </EcoCard>
        </TouchableOpacity>

        {/* Add New Payment Method */}
        {!showAddCard ? (
          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={() => setShowAddCard(true)}
          >
            <EcoCard style={styles.addPaymentCardInner}>
              <Icon name="add" size={24} color={Colors.primary} />
              <Text style={styles.addPaymentText}>Add New Card</Text>
            </EcoCard>
          </TouchableOpacity>
        ) : (
          <EcoCard style={styles.addCardForm}>
            <Text style={styles.addCardTitle}>Add New Card</Text>
            
            <EcoInput
              label="Cardholder Name"
              value={newCardData.cardholderName}
              onChangeText={(text) => setNewCardData(prev => ({ ...prev, cardholderName: text }))}
              placeholder="John Doe"
              style={styles.cardInput}
            />
            
            <EcoInput
              label="Card Number"
              value={newCardData.cardNumber}
              onChangeText={(text) => setNewCardData(prev => ({ ...prev, cardNumber: text.replace(/\s/g, '') }))}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
              maxLength={19}
              style={styles.cardInput}
            />
            
            <View style={styles.cardRowInputs}>
              <EcoInput
                label="Expiry Date"
                value={newCardData.expiryDate}
                onChangeText={(text) => setNewCardData(prev => ({ ...prev, expiryDate: text }))}
                placeholder="MM/YY"
                keyboardType="numeric"
                maxLength={5}
                style={[styles.cardInput, styles.halfWidth]}
              />
              
              <EcoInput
                label="CVV"
                value={newCardData.cvv}
                onChangeText={(text) => setNewCardData(prev => ({ ...prev, cvv: text }))}
                placeholder="123"
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
                style={[styles.cardInput, styles.halfWidth]}
              />
            </View>
            
            <View style={styles.addCardActions}>
              <EcoButton
                title="Cancel"
                variant="outline"
                onPress={() => setShowAddCard(false)}
                style={styles.addCardButton}
              />
              <EcoButton
                title="Add Card"
                onPress={handleAddPaymentMethod}
                style={styles.addCardButton}
              />
            </View>
          </EcoCard>
        )}
      </View>

      {/* Security Info */}
      <EcoCard style={styles.securityCard}>
        <View style={styles.securityHeader}>
          <Icon name="security" size={20} color={Colors.success} />
          <Text style={styles.securityTitle}>Secure Payment</Text>
        </View>
        <Text style={styles.securityText}>
          Your payment information is encrypted and secure. We never store your full card details.
        </Text>
      </EcoCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.large,
  },
  title: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginBottom: Spacing.large,
    textAlign: 'center',
  },
  fareBreakdownCard: {
    marginBottom: Spacing.large,
  },
  fareBreakdownTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  fareLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  fareValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  fareTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.small,
    marginTop: Spacing.small,
  },
  fareTotalLabel: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  fareTotalValue: {
    ...Typography.heading3,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  ecoDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.small,
    padding: Spacing.small,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.small,
  },
  ecoDiscountText: {
    ...Typography.caption,
    color: Colors.success,
    marginLeft: Spacing.small,
    fontWeight: 'bold',
  },
  paymentMethodsContainer: {
    marginBottom: Spacing.large,
  },
  sectionTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
  },
  paymentMethodCard: {
    marginBottom: Spacing.medium,
  },
  selectedPaymentMethod: {
    transform: [{ scale: 1.02 }],
  },
  paymentMethodCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: Spacing.medium,
    flex: 1,
  },
  paymentMethodName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  paymentMethodSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  selectedText: {
    color: Colors.primary,
  },
  addPaymentButton: {
    marginBottom: Spacing.medium,
  },
  addPaymentCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.large,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  addPaymentText: {
    ...Typography.body,
    color: Colors.primary,
    marginLeft: Spacing.small,
    fontWeight: 'bold',
  },
  addCardForm: {
    marginBottom: Spacing.medium,
  },
  addCardTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
  },
  cardInput: {
    marginBottom: Spacing.medium,
  },
  cardRowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  addCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.medium,
  },
  addCardButton: {
    width: '48%',
  },
  securityCard: {
    backgroundColor: Colors.successLight,
    marginBottom: Spacing.large,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  securityTitle: {
    ...Typography.body,
    color: Colors.success,
    fontWeight: 'bold',
    marginLeft: Spacing.small,
  },
  securityText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
});

export default PaymentFeature;
