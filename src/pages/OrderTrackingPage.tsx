import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, Store, Package, Truck, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface OrderData {
  id?: string;
  storeName?: string;
  storeAddress?: string;
  items?: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  status?: string;
  driverStatus?: string;
  driverId?: string | null;
  destinationAddress?: string;
  stops?: Array<{ address: string; items?: OrderItem[] }>;
  type?: string;
}

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'driver_assigned';

const statusSteps: { key: OrderStatus | 'searching'; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Waiting for store to accept', icon: Store },
  { key: 'accepted', label: 'Order Accepted', icon: Check },
  { key: 'preparing', label: 'Preparing Items', icon: Package },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: Package },
  { key: 'searching', label: 'Assigning driver...', icon: Truck },
  { key: 'driver_assigned', label: 'Driver Assigned', icon: User },
];

const getStatusIndex = (status: string, driverStatus?: string): number => {
  if (status === 'driver_assigned' || (status === 'ready_for_pickup' && driverStatus === 'assigned')) {
    return 5;
  }
  if (driverStatus === 'searching') {
    return 4;
  }
  const statusMap: Record<string, number> = {
    pending: 0,
    accepted: 1,
    preparing: 2,
    ready_for_pickup: 3,
  };
  return statusMap[status] ?? 0;
};

export const OrderTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId, orderData: initialOrderData } = location.state || {};

  const [orderData, setOrderData] = useState<OrderData>(initialOrderData || {});
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  // Listen to Firestore order document in real-time
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as OrderData;
        setOrderData({ ...data, id: orderId });

        const newStatusIndex = getStatusIndex(data.status || 'pending', data.driverStatus);
        setCurrentStatusIndex(newStatusIndex);

        // Auto transition to LiveTrackingPage when driver is assigned
        if (data.status === 'driver_assigned' || data.driverId) {
          setTimeout(() => {
            navigate('/live-tracking', {
              state: {
                orderId,
                orderData: { ...data, id: orderId },
              },
              replace: true,
            });
          }, 2500);
        }
      }
    });

    return () => unsubscribe();
  }, [orderId, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Panel */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white rounded-b-3xl shadow-lg p-6 mx-4 mt-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{orderData.storeName || 'Store'}</h1>
            <p className="text-sm text-gray-500">#{orderId?.slice(-4).toUpperCase() || 'Order'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              R {orderData.total?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg p-6 mx-4 mt-4"
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-0">
          {statusSteps.map((step, index) => {
            const isCompleted = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isFuture = index > currentStatusIndex;
            const Icon = step.icon;

            return (
              <motion.div key={step.key} variants={itemVariants} className="relative">
                <div className="flex items-start">
                  {/* Timeline Line */}
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-[32px] w-0.5 h-12 transition-colors duration-500 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}

                  {/* Icon Circle */}
                  <motion.div
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={isCurrent ? { repeat: Infinity, duration: 1.5 } : {}}
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-green-500 text-white ring-4 ring-green-100'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                  </motion.div>

                  {/* Label */}
                  <div className="ml-4 pb-8">
                    <p
                      className={`font-medium transition-colors duration-300 ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                      } ${isCurrent ? 'font-bold' : ''}`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && step.key === 'searching' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center mt-1"
                      >
                        <div className="flex space-x-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 bg-green-500 rounded-full"
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Order Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-lg p-6 mx-4 mt-4"
      >
        <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {orderData.items && orderData.items.length > 0 ? (
            orderData.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center space-x-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">x{item.quantity || 1}</p>
                  <p className="font-medium text-gray-900">R {(item.price * (item.quantity || 1)).toFixed(2)}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No items in order</p>
          )}
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">R {orderData.subtotal?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="text-gray-900">R {orderData.deliveryFee?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">R {orderData.total?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </motion.div>

      {/* Delivery Address */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-lg p-6 mx-4 mt-4 mb-6"
      >
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Delivery to</p>
            <p className="text-gray-600 text-sm mt-1">{orderData.destinationAddress || 'Address not specified'}</p>
          </div>
        </div>

        {/* Multiple Stops */}
        {orderData.stops && orderData.stops.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="font-medium text-gray-900 mb-3">Delivery Stops</p>
            {orderData.stops.map((stop, index) => (
              <div key={index} className="flex items-start space-x-3 mb-3 last:mb-0">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-orange-600">{index + 1}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stop.address || stop}</p>
                  {stop.items && stop.items.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {stop.items.map((item) => item.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
