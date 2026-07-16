import { useState, useEffect, useRef } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { useDashboardStats, useAllOrders, useUpdateOrderStatus } from '../hooks/useAdminOrders';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../store/toastStore.ts';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../api/client';
import { formatPrice, formatDate, getImageUrl, getFallbackImageUrl } from '../utils/formatters.ts';
import productService from '../services/productService';
import { TableRowSkeleton } from '../components/ui/SkeletonLoader.tsx';
import ErrorState from '../components/ui/ErrorState.tsx';
import EmptyState from '../components/ui/EmptyState.tsx';
import { QUERY_KEYS } from '../constants';
import {
  FaBoxOpen, FaShoppingBag, FaRupeeSign, FaPlus, FaEdit, FaTrashAlt,
  FaChartBar, FaClipboardList, FaSpinner, FaTimes, FaHeadset, FaPaperPlane, FaUser,
} from 'react-icons/fa';


const CATEGORY_MAP = {
  1: 'Electronics',
  2: 'Fashion',
  3: 'Mobiles',
  4: 'Home & Kitchen',
  5: 'Books',
  6: 'Sports',
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="text-2xl text-white" />
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

function ProductFormModal({ initial, onClose, onSave, isSaving }) {
  const [form, setForm] = useState(
    initial
      ? { 
          ...initial, 
          category_id: initial.category_id || '',
          image_url: initial.image_url || '',
          images: initial.images || []
        }
      : { 
          name: '', 
          description: '', 
          price: '', 
          stock: '', 
          category_id: '',
          image_url: '',
          images: []
        }
  );
  const [generating, setGenerating] = useState(false);
  const [managedImages, setManagedImages] = useState([]);
  const [newUrlInput, setNewUrlInput] = useState('');

  useEffect(() => {
    if (initial) {
      const list = [];
      if (initial.images && initial.images.length > 0) {
        initial.images.forEach(img => {
          list.push({ type: 'existing', url: img });
        });
      } else if (initial.image_url) {
        list.push({ type: 'existing', url: initial.image_url });
      }
      setManagedImages(list);
    } else {
      setManagedImages([]);
    }
  }, [initial]);

  useEffect(() => {
    return () => {
      managedImages.forEach(img => {
        if (img.type === 'file' && img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [managedImages]);

  const handleDeleteImageItem = (idx) => {
    setManagedImages((prev) => {
      const item = prev[idx];
      if (item.type === 'file' && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleAddUrlImage = () => {
    if (!newUrlInput.trim()) return;
    if (managedImages.length >= 5) {
      toast.warning('Maximum of 5 images allowed.');
      return;
    }
    setManagedImages((prev) => [
      ...prev,
      { type: 'url', url: newUrlInput.trim() }
    ]);
    setNewUrlInput('');
  };

  const handleAddFileImages = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (managedImages.length + selectedFiles.length > 5) {
      toast.warning('Maximum of 5 images allowed. Some files were not added.');
    }
    
    const spaceLeft = 5 - managedImages.length;
    const filesToAdd = selectedFiles.slice(0, spaceLeft);
    
    const newItems = filesToAdd.map(file => ({
      type: 'file',
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    
    setManagedImages((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleGenerateDescription = async () => {
    if (!form.name.trim()) {
      toast.warning('Please enter a product name first to generate a description.');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await api.post('/ai/generate-description', {
        name: form.name.trim(),
        category: form.category || undefined,
        price: form.price ? parseFloat(form.price) : undefined
      });
      setForm(p => ({ ...p, description: response.data.description }));
      toast.success('Description generated successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to generate description.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fileItems = managedImages.filter(img => img.type === 'file');
    const nonFileItems = managedImages.filter(img => img.type !== 'file');
    const finalImages = nonFileItems.map(img => img.url);
    const finalImageUrl = finalImages.length > 0 ? finalImages[0] : '';

    onSave({
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      image_url: finalImageUrl || null,
      images: finalImages,
    }, fileItems.map(img => img.file));
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 transition-all text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            {initial ? 'Edit Product' : 'Create Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Product Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required minLength={2} placeholder="iPhone 15 Pro" className={inputClass} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Description *</label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generating}
                className="text-xs font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-450 dark:hover:text-blue-450 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {generating ? (
                  <>
                    <FaSpinner className="animate-spin text-[10px]" />
                    Generating...
                  </>
                ) : (
                  <>
                    🪄 Generate with AI
                  </>
                )}
              </button>
            </div>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} required minLength={5} placeholder="Short product description (at least 5 characters)" className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Price (₹) *</label>
              <input name="price" type="number" step="0.01" min="0.01" value={form.price} onChange={handleChange} required placeholder="999.00" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Stock *</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required placeholder="50" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Category *</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Select Category</option>
                <option value="1">Electronics</option>
                <option value="2">Fashion</option>
                <option value="3">Mobiles</option>
                <option value="4">Home & Kitchen</option>
                <option value="5">Books</option>
                <option value="6">Sports</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Product Images (Up to 5 images)
            </label>
            
            {/* Image List Preview Grid */}
            {managedImages.length > 0 && (
              <div className="grid grid-cols-5 gap-3 p-3 bg-gray-50 dark:bg-gray-700/20 border border-gray-150 dark:border-gray-700 rounded-xl mb-3">
                {managedImages.map((img, idx) => {
                  const src = img.type === 'file' ? img.previewUrl : getImageUrl(img.url);
                  const isWeb = img.type === 'url';
                  const isFile = img.type === 'file';
                  return (
                    <div key={idx} className="relative group aspect-square rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                      <img
                        src={src}
                        alt={`Preview ${idx}`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackImageUrl(form.name || 'product', form.category_id);
                        }}
                      />
                      
                      {/* Source Badge */}
                      <span className={`absolute bottom-1 left-1 right-1 text-[8px] font-bold text-center py-0.5 rounded shadow-sm opacity-90 ${
                        isFile 
                          ? 'bg-blue-500 text-white' 
                          : isWeb 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-green-600 text-white'
                      }`}>
                        {isFile ? 'Local' : isWeb ? 'Web Link' : 'Uploaded'}
                      </span>
                      
                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => handleDeleteImageItem(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-650 hover:bg-red-700 text-white rounded-full shadow-md transition-transform scale-90 group-hover:scale-100 opacity-90 cursor-pointer"
                        title="Remove Image"
                      >
                        <FaTrashAlt className="text-[10px]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Image Inputs */}
            {managedImages.length < 5 ? (
              <div className="space-y-3 bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                {/* Web URL option */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newUrlInput}
                    onChange={(e) => setNewUrlInput(e.target.value)}
                    placeholder="Paste public image URL..."
                    className={`${inputClass} flex-grow`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddUrlImage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlImage}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    Add URL
                  </button>
                </div>
                
                <div className="relative flex items-center justify-center border border-gray-300 dark:border-gray-650 rounded-lg p-2 bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">📁 Upload Local File</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddFileImages}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-bold text-center text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 py-2 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                ⚠️ Maximum limit of 5 images reached. Remove an image to add a new one.
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isSaving && <FaSpinner className="animate-spin text-xs" />}
              {initial ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, products, username, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[90vh] animate-fadeIn">
        <div className="flex items-center justify-between mb-5 border-b dark:border-gray-700 pb-3">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Order Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Order ID: #{order.id} | Customer: {username}</p>
          </div>
          <button onClick={onClose} className="text-gray-450 hover:text-gray-700 dark:hover:text-gray-200 p-1">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Shipping Address */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-750">
            <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              📍 Shipping & Customer Details
            </h3>
            <pre className="text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
              {order.shipping_address || 'No shipping address provided.'}
            </pre>
          </div>

          {/* Payment & Logistics Info */}
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-750 space-y-3">
            <h3 className="text-xs font-bold text-gray-455 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              💳 Payment & Logistics
            </h3>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Method</p>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{order.payment_method}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Status</p>
              <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide border mt-0.5 ${
                order.payment_status === 'Completed'
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400'
              }`}>
                {order.payment_status}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Order Status</p>
              <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide border mt-0.5 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400">
                {order.status || order.order_status || 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Ordered Products Table */}
        <div className="border border-gray-150 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] text-gray-550 font-bold uppercase">
              <tr>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5 text-center">Qty</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-700 text-xs">
              {order.items && order.items.map((item) => {
                const prod = products.find((p) => p.id === item.product_id);
                return (
                  <tr key={item.id} className="dark:text-gray-250">
                    <td className="px-4 py-3 font-semibold truncate max-w-xs">{prod ? prod.name : `Product ID #${item.product_id}`}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-500 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-500 dark:text-gray-400">{formatPrice(item.price)}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-600 dark:text-blue-400">{formatPrice(item.price * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary */}
        <div className="flex flex-col items-end space-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 pt-4">
          <div className="flex justify-between w-64">
            <span>Subtotal:</span>
            <span>{formatPrice(order.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between w-64">
            <span>Tax:</span>
            <span>{formatPrice(order.tax || 0)}</span>
          </div>
          <div className="flex justify-between w-64">
            <span>Shipping:</span>
            <span>{formatPrice(order.shipping_fee || 0)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between w-64 text-green-600 font-bold">
              <span>Discount:</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between w-64 text-sm font-black text-gray-900 dark:text-white border-t dark:border-gray-700 pt-1.5">
            <span>Total:</span>
            <span className="text-blue-650 dark:text-blue-400">{formatPrice(order.total_price || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editProduct, setEditProduct] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Data hooks
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProducts();
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useAllOrders();

  useEffect(() => {
    const fetchUsernames = async () => {
      const uids = Array.from(new Set(orders.map((o) => o.user_id)));
      for (const uid of uids) {
        if (uid && !usernames[uid]) {
          try {
            const response = await api.get(`/auth/users/${uid}`, { skipToast: true });
            if (response.data && response.data.username) {
              setUsernames((prev) => ({
                ...prev,
                [uid]: response.data.username,
              }));
            }
          } catch (err) {
            console.error(`Failed to fetch username for user ID ${uid}:`, err);
            // Cache a fallback to prevent infinite fetch loop
            setUsernames((prev) => ({
              ...prev,
              [uid]: `Customer #${uid}`,
            }));
          }
        }
      }
    };
    if (orders && orders.length > 0) {
      fetchUsernames();
    }
  }, [orders]);

  // Mutations
  const { mutateAsync: createProduct, isPending: creating } = useCreateProduct();
  const { mutateAsync: updateProduct, isPending: updating } = useUpdateProduct();
  const { mutateAsync: deleteProduct } = useDeleteProduct();
  const { mutateAsync: updateOrderStatus } = useUpdateOrderStatus();

  // Live updates via WebSocket
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'order_update' || lastMessage.type === 'notification')) {
      refetchOrders();
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  }, [lastMessage, queryClient, refetchOrders, refetchProducts]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    const existingOrder = orders.find(o => o.id === orderId);
    try {
      await updateOrderStatus({
        orderId,
        status: newStatus,
        current_location: existingOrder?.current_location
      });
      toast.success(`Order #${orderId} status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err?.detail || 'Failed to update order status');
    }
  };

  const handleCreate = async (data, imageFiles) => {
    try {
      const filteredData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        category_id: data.category_id,
        image_url: data.image_url || null,
        images: data.images || [],
      };
      const newProduct = await createProduct(filteredData);
      if (imageFiles && imageFiles.length > 0) {
        await productService.uploadImage(newProduct.id, imageFiles);
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully!');
      setShowCreateModal(false);
    } catch (err) {
      const errDetail = err?.detail?.[0];
      const errMsg = errDetail
        ? `${errDetail.loc?.[errDetail.loc.length - 1] || 'Field'}: ${errDetail.msg}`
        : err?.detail || 'Failed to create product';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to create product');
    }
  };

  const handleUpdate = async (data, imageFiles) => {
    try {
      const filteredData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        category_id: data.category_id,
        image_url: data.image_url || null,
        images: data.images || [],
      };
      await updateProduct({ id: editProduct.id, data: filteredData });
      if (imageFiles && imageFiles.length > 0) {
        await productService.uploadImage(editProduct.id, imageFiles);
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully!');
      setEditProduct(null);
    } catch (err) {
      const errDetail = err?.detail?.[0];
      const errMsg = errDetail
        ? `${errDetail.loc?.[errDetail.loc.length - 1] || 'Field'}: ${errDetail.msg}`
        : err?.detail || 'Failed to update product';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to update product');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      setDeletingId(id);
      await deleteProduct(id);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err?.detail || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const tabClass = (tab) =>
    `px-5 py-2.5 font-bold text-sm rounded-xl transition-all flex-shrink-0 ${
      activeTab === tab
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage products, orders and view platform metrics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto whitespace-nowrap max-w-full scrollbar-none">
          <button onClick={() => setActiveTab('dashboard')} className={tabClass('dashboard')}>
            <span className="flex items-center gap-2"><FaChartBar /> Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('products')} className={tabClass('products')}>
            <span className="flex items-center gap-2"><FaBoxOpen /> Products ({products.length})</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={tabClass('orders')}>
            <span className="flex items-center gap-2"><FaClipboardList /> Orders ({orders.length})</span>
          </button>
          <button onClick={() => setActiveTab('chat')} className={tabClass('chat')}>
            <span className="flex items-center gap-2"><FaHeadset /> Support Chat</span>
          </button>
        </div>

        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <StatCard
                icon={FaBoxOpen}
                label="Total Products"
                value={statsLoading ? '—' : (stats?.totalProducts ?? products.length)}
                color="bg-blue-500"
              />
              <StatCard
                icon={FaShoppingBag}
                label="Total Orders"
                value={statsLoading ? '—' : (stats?.totalOrders ?? orders.length)}
                color="bg-green-500"
              />
              <StatCard
                icon={FaRupeeSign}
                label="Revenue"
                value={statsLoading ? '—' : `₹${((stats?.revenue ?? 0) / 1000).toFixed(1)}K`}
                color="bg-amber-500"
              />
              <StatCard
                icon={FaUser}
                label="Customers Who Ordered"
                value={statsLoading ? '—' : (stats?.uniqueUsers ?? 0)}
                color="bg-purple-500"
              />
              <StatCard
                icon={FaShoppingBag}
                label="Products Sold"
                value={statsLoading ? '—' : (stats?.productsSold ?? 0)}
                color="bg-rose-500"
              />
            </div>

            {/* Recent Products */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">Recent Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {products.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex-shrink-0">
                      <img
                        src={getImageUrl(p.image_url)}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          if (currentSrc.startsWith('data:image/svg+xml')) {
                            e.currentTarget.onerror = null;
                            return;
                          }
                          const fallbackUrl = getFallbackImageUrl(p.name, p.category || p.category_id);
                          if (currentSrc !== fallbackUrl) {
                            e.currentTarget.src = fallbackUrl;
                          } else {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="%239ca3af">${encodeURIComponent(p.name)}</text></svg>`;
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-black">{formatPrice(p.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Products Tab ── */}
        {activeTab === 'products' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Product Management</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                <FaPlus /> Add Product
              </button>
            </div>

            {productsError ? (
              <div className="p-6">
                <ErrorState title="Failed to load products" onRetry={refetchProducts} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {['#', 'Image', 'Name', 'Price', 'Stock', 'Category', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {productsLoading
                      ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                      : products.map((p, index) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">#{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                <img
                                  src={getImageUrl(p.image_url)}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const currentSrc = e.currentTarget.src;
                                    if (currentSrc.startsWith('data:image/svg+xml')) {
                                      e.currentTarget.onerror = null;
                                      return;
                                    }
                                    const fallbackUrl = getFallbackImageUrl(p.name, p.category || p.category_id);
                                    if (currentSrc !== fallbackUrl) {
                                      e.currentTarget.src = fallbackUrl;
                                    } else {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2059/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="%239ca3af">${encodeURIComponent(p.name)}</text></svg>`;
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 max-w-xs truncate">{p.name}</td>
                            <td className="px-4 py-3 text-sm font-black text-blue-600 dark:text-blue-400">{formatPrice(p.price)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                p.stock === 0
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                  : p.stock < 10
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                              }`}>
                                {p.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{CATEGORY_MAP[p.category_id] || p.category || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditProduct(p)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  disabled={deletingId === p.id}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40"
                                  title="Delete"
                                >
                                  {deletingId === p.id ? <FaSpinner className="animate-spin" /> : <FaTrashAlt />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
                {!productsLoading && products.length === 0 && (
                  <div className="p-8">
                    <EmptyState emoji="📦" title="No Products Found" message="Create your first product using the button above." />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Order Management</h2>
            </div>
            {ordersError ? (
              <div className="p-6">
                <ErrorState
                  title="Orders endpoint unavailable"
                  message="The /orders/all admin endpoint may not be implemented in the backend. Check your FastAPI backend."
                  onRetry={refetchOrders}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {['Order ID', 'User', 'Total', 'Date', 'Status', 'Current Location'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {ordersLoading
                      ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                      : orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-black text-gray-900 dark:text-white">#{order.id}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => setSelectedOrderDetails(order)}
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-left cursor-pointer transition-colors focus:outline-none"
                              >
                                {usernames[order.user_id] || `User #${order.user_id}`}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">{formatPrice(order.total_price || 0)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(order.created_at)}</td>
                            <td className="px-4 py-3">
                              <select
                                value={order.status || order.order_status || 'Pending'}
                                onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-none capitalize focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              >
                                {['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
                                  <option key={status} value={status} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-150">
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  defaultValue={order.current_location || ''}
                                  placeholder="Warehouse"
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const newLoc = e.target.value;
                                      try {
                                        await updateOrderStatus({
                                          orderId: order.id,
                                          status: order.status || order.order_status || 'Pending',
                                          current_location: newLoc
                                        });
                                        toast.success(`Updated location for Order #${order.id}`);
                                      } catch (err) {
                                        toast.error('Failed to update location');
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-semibold border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none w-36"
                                />
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    const inputVal = e.currentTarget.previousSibling.value;
                                    try {
                                      await updateOrderStatus({
                                        orderId: order.id,
                                        status: order.status || order.order_status || 'Pending',
                                        current_location: inputVal
                                      });
                                      toast.success(`Updated location for Order #${order.id}`);
                                    } catch (err) {
                                      toast.error('Failed to update location');
                                    }
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer text-xs font-bold"
                                  title="Save Location"
                                >
                                  💾
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
                {!ordersLoading && orders.length === 0 && (
                  <div className="p-8">
                    <EmptyState emoji="🛒" title="No Orders Found" message="No orders have been placed yet." />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <AdminSupportChat />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ProductFormModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
          isSaving={creating}
        />
      )}
      {editProduct && (
        <ProductFormModal
          initial={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={handleUpdate}
          isSaving={updating}
        />
      )}
      {selectedOrderDetails && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          products={products}
          username={usernames[selectedOrderDetails.user_id] || `User #${selectedOrderDetails.user_id}`}
          onClose={() => setSelectedOrderDetails(null)}
        />
      )}
    </div>
  );
}

function AdminSupportChat() {
  const { chatMessages, typingStates, send } = useWebSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [usernames, setUsernames] = useState({});

  const activeUsers = Array.from(
    new Set(
      chatMessages
        .map((m) => (m.sender_id === 1 ? m.receiver_id : m.sender_id))
        .filter((id) => id !== 1)
    )
  );

  useEffect(() => {
    activeUsers.forEach(async (uid) => {
      if (uid && !usernames[uid]) {
        try {
          const response = await api.get(`/auth/users/${uid}`, { skipToast: true });
          if (response.data && response.data.username) {
            setUsernames((prev) => ({
              ...prev,
              [uid]: response.data.username,
            }));
          }
        } catch (err) {
          console.error(`Failed to fetch username for user ID ${uid}:`, err);
          // Set fallback name to prevent infinite network requests loop
          setUsernames((prev) => ({
            ...prev,
            [uid]: `Customer #${uid}`,
          }));
        }
      }
    });
  }, [activeUsers, usernames]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, typingStates, selectedUser]);

  const selectedMessages = chatMessages.filter(
    (m) =>
      (m.sender_id === 1 && m.receiver_id === selectedUser) ||
      (m.sender_id === selectedUser && m.receiver_id === 1)
  );

  const isUserTyping = typingStates[selectedUser];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    send({
      action: 'send_chat',
      receiver_id: selectedUser,
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    });

    setInputText('');

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    send({
      action: 'typing',
      receiver_id: selectedUser,
      is_typing: false,
    });
    setIsTyping(false);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!selectedUser) return;

    if (!isTyping) {
      setIsTyping(true);
      send({
        action: 'typing',
        receiver_id: selectedUser,
        is_typing: true,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      send({
        action: 'typing',
        receiver_id: selectedUser,
        is_typing: false,
      });
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col md:flex-row h-[550px] md:h-[500px]">
      <div className={`w-full md:w-1/3 border-r border-gray-100 dark:border-gray-700 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-bold text-sm text-gray-800 dark:text-gray-200">
          Active Chats
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
          {activeUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 font-semibold">No active customer chats</div>
          ) : (
            activeUsers.map((uid) => (
              <button
                key={uid}
                onClick={() => setSelectedUser(uid)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between text-xs font-semibold ${
                  selectedUser === uid ? 'bg-blue-50/50 dark:bg-gray-700/50 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{usernames[uid] || `Customer #${uid}`}</span>
                {typingStates[uid] && (
                  <span className="text-[10px] text-green-500 animate-pulse font-normal italic">typing...</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-grow flex flex-col bg-gray-50/20 dark:bg-gray-900/10 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden text-blue-600 hover:text-blue-700 flex items-center gap-1 mr-2"
                >
                  ← Back
                </button>
                <span>{usernames[selectedUser] ? `${usernames[selectedUser]}'s Support Session` : `Customer #${selectedUser} Support Session`}</span>
              </div>
              {isUserTyping && <span className="text-green-500 font-medium italic animate-pulse">typing...</span>}
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedMessages.map((msg) => {
                const isMe = msg.sender_id === 1;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-end gap-1.5 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] shadow-sm flex-shrink-0 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-350'}`}>
                        {isMe ? <FaUser /> : <FaHeadset />}
                      </div>
                      <div className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm border ${isMe ? 'bg-blue-600 border-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-150 border-gray-200 dark:border-gray-750 rounded-tl-none'}`}>
                        <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <span className={`block text-[8px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2 items-center">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Reply to ${usernames[selectedUser] || `Customer #${selectedUser}`}...`}
                className="flex-grow px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95"
              >
                <FaPaperPlane className="text-xs" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-1">
            <p className="text-4xl">💬</p>
            <h3 className="font-bold text-gray-800 dark:text-gray-150 text-sm">Customer Support Desk</h3>
            <p className="text-xs text-gray-400 font-semibold max-w-xs">Select a customer from the left sidebar list to begin replying to messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
