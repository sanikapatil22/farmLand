'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import FarmerLayout from '@/components/farmer/FarmerLayout';
import {
    Plus,
    Search,
    Filter,
    Package,
    Clock,
    MapPin,
    Calendar,
    X,
    Loader2,
    Trash2,
    Leaf,
    Sprout,
    Activity,
    Droplets,
    FlaskConical,
    Bug,
    Scissors,
    PackageCheck,
    Truck,
    ShoppingCart,
    DollarSign,
    Shield,
    Link2,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Zap,
    QrCode,
    Download
} from 'lucide-react';
import { graphqlRequest } from '@/lib/apollo-client';
import { MY_FARMS_QUERY } from '@/lib/graphql/farm';
import { CREATE_BATCH_MUTATION, LIST_BATCHES_QUERY, DELETE_BATCH_MUTATION, LOG_ACTIVITY_MUTATION, VERIFY_ORGANIC_QUERY } from '@/lib/graphql/batch';
import { CREATE_PRODUCT_MUTATION } from '@/lib/graphql/product';
import { analyzeTimeline } from '@/lib/timeline/analyzeTimeline';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';

const CROP_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Other'];

// Activity types from schema enum
const ACTIVITY_TYPES = [
    { value: 'SEEDING', label: 'Seeding', icon: Sprout, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'WATERING', label: 'Watering', icon: Droplets, color: 'bg-blue-100 text-blue-700' },
    { value: 'FERTILIZER', label: 'Fertilizer', icon: FlaskConical, color: 'bg-amber-100 text-amber-700' },
    { value: 'PESTICIDE', label: 'Pesticide', icon: Bug, color: 'bg-red-100 text-red-700' },
    { value: 'HARVEST', label: 'Harvest', icon: Scissors, color: 'bg-green-100 text-green-700' },
    { value: 'PACKED', label: 'Packed', icon: PackageCheck, color: 'bg-purple-100 text-purple-700' },
    { value: 'SHIPPED', label: 'Shipped', icon: Truck, color: 'bg-emerald-100 text-emerald-700' }
];

import { useAuth } from '@/context/AuthContext';

export default function BatchTracking() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const router = useRouter();
    const [batches, setBatches] = useState([]);
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [verificationResults, setVerificationResults] = useState({});
    const [verifying, setVerifying] = useState({});
    const [showQRModal, setShowQRModal] = useState(false);

    const [formData, setFormData] = useState({
        farm: '',
        cropCategory: '',
        cropName: '',
        variety: '',
        seedSource: '',
        sowingDate: '',
        expectedHarvestDate: ''
    });

    const [activityFormData, setActivityFormData] = useState({
        activityType: '',
        productName: '',
        quantity: '',
        driverName: '',
        vehicleNumber: '',
        notes: '',
        isOrganic: false
    });

    const [productFormData, setProductFormData] = useState({
        title: '',
        description: '',
        pricePerKg: '',
        availableQty: '',
        minOrderQty: '1',
        isOrganic: false
    });

    useEffect(() => {
        if (!user) return;
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const farmsData = await graphqlRequest(MY_FARMS_QUERY);
            const myFarms = farmsData.myFarms || [];
            setFarms(myFarms);

            if (myFarms.length > 0) {
                const allBatches = [];
                for (const farm of myFarms) {
                    try {
                        const batchData = await graphqlRequest(LIST_BATCHES_QUERY, { farm: farm.id });
                        if (batchData.listBatches) {
                            allBatches.push(...batchData.listBatches.map(b => ({ ...b, farmInfo: farm })));
                        }
                    } catch (e) {
                        console.error('Error fetching batches for farm:', farm.id, e);
                    }
                }
                setBatches(allBatches);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Poll for updates if any activity is pending
    useEffect(() => {
        const hasPending = batches.some(b => 
            b.activities?.some(a => a.blockchainStatus === 'pending')
        );

        if (hasPending) {
            const interval = setInterval(() => {
                // Silent fetch (don't set loading to true)
                const fetchSilent = async () => {
                    try {
                        const farmsData = await graphqlRequest(MY_FARMS_QUERY);
                        const myFarms = farmsData.myFarms || [];
                        if (myFarms.length > 0) {
                            const allBatches = [];
                            for (const farm of myFarms) {
                                const batchData = await graphqlRequest(LIST_BATCHES_QUERY, { farm: farm.id });
                                if (batchData.listBatches) {
                                    allBatches.push(...batchData.listBatches.map(b => ({ ...b, farmInfo: farm })));
                                }
                            }
                            setBatches(allBatches);
                        }
                    } catch (e) {
                        console.error('Polling error', e);
                    }
                };
                fetchSilent();
            }, 5000); // Check every 5 seconds
            
            return () => clearInterval(interval);
        }
    }, [batches]);

    const resetForm = () => {
        setFormData({
            farm: farms.length > 0 ? farms[0].id : '',
            cropCategory: '',
            cropName: '',
            variety: '',
            seedSource: '',
            sowingDate: '',
            expectedHarvestDate: ''
        });
        setError('');
    };

    const resetActivityForm = () => {
        setActivityFormData({
            activityType: '',
            productName: '',
            quantity: '',
            notes: '',
            driverName: '',
            vehicleNumber: '',
            isOrganic: false
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const input = {
                farm: formData.farm,
                cropCategory: formData.cropCategory,
                cropName: formData.cropName,
                variety: formData.variety || null,
                seedSource: formData.seedSource || null,
                sowingDate: formData.sowingDate,
                expectedHarvestDate: formData.expectedHarvestDate || null
            };

            const data = await graphqlRequest(CREATE_BATCH_MUTATION, { input });
            const selectedFarm = farms.find(f => f.id === formData.farm);
            setBatches(prev => [...prev, { ...data.createBatch, farmInfo: selectedFarm }]);
            setShowCreateModal(false);
            resetForm();
        } catch (err) {
            setError(err.message || 'Failed to create batch');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogActivity = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        setSubmitting(true);
        setError('');

        try {
            // Build notes with driver/vehicle info for SHIPPED
            let notesContent = activityFormData.notes || '';
            if (activityFormData.activityType === 'SHIPPED') {
                const shippingInfo = `Driver: ${activityFormData.driverName} | Vehicle: ${activityFormData.vehicleNumber}`;
                notesContent = notesContent ? `${shippingInfo}\n${notesContent}` : shippingInfo;
            }

            const input = {
                activityType: activityFormData.activityType,
                date: new Date().toISOString(),
                productName: activityFormData.productName || null,
                quantity: activityFormData.quantity ? parseFloat(activityFormData.quantity) : null,
                notes: notesContent || null,
                isOrganic: activityFormData.isOrganic
            };

            const data = await graphqlRequest(LOG_ACTIVITY_MUTATION, { 
                batchId: selectedBatch.id, 
                input 
            });

            setBatches(prev => prev.map(b => 
                b.id === selectedBatch.id 
                    ? { ...b, ...data.logActivity, farmInfo: b.farmInfo }
                    : b
            ));

            setShowActivityModal(false);
            setSelectedBatch(null);
            resetActivityForm();
        } catch (err) {
            setError(err.message || 'Failed to log activity');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this batch?')) return;

        try {
            await graphqlRequest(DELETE_BATCH_MUTATION, { id });
            setBatches(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            alert('Failed to delete batch: ' + err.message);
        }
    };

    const openActivityModal = (batch) => {
        setSelectedBatch(batch);
        resetActivityForm();
        setShowActivityModal(true);
    };

    const openProductModal = (batch) => {
        setSelectedBatch(batch);
        // Pre-fill product data from batch
        setProductFormData({
            title: batch.cropName + (batch.variety ? ` - ${batch.variety}` : ''),
            description: `Fresh ${batch.cropName} from ${batch.seedSource || 'local farm'}. Sowed on ${new Date(batch.sowingDate).toLocaleDateString()}.`,
            pricePerKg: '',
            availableQty: '',
            minOrderQty: '1',
            isOrganic: batch.farmInfo?.organicStatus === 'certified'
        });
        setError('');
        setShowProductModal(true);
    };

    const checkOrganicStatus = async (batchId) => {
        setVerifying(prev => ({ ...prev, [batchId]: true }));
        try {
            const data = await graphqlRequest(VERIFY_ORGANIC_QUERY, { batchId });
            setVerificationResults(prev => ({
                ...prev,
                [batchId]: data.verifyOrganic
            }));
        } catch (err) {
            console.error('Verification failed:', err);
        } finally {
            setVerifying(prev => ({ ...prev, [batchId]: false }));
        }
    };

    const openQRModal = (batch) => {
        setSelectedBatch(batch);
        setShowQRModal(true);
    };

    const handleDownloadQR = () => {
        const node = document.getElementById('qr-code-node');
        if (node) {
            toPng(node)
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `${selectedBatch?.cropName || 'batch'}-qrcode.png`;
                    link.href = dataUrl;
                    link.click();
                })
                .catch((err) => {
                    console.error('Could not generate QR image', err);
                });
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        setSubmitting(true);
        setError('');

        try {
            await graphqlRequest(CREATE_PRODUCT_MUTATION, {
                batchId: selectedBatch.id,
                title: productFormData.title,
                description: productFormData.description || null,
                category: selectedBatch.cropCategory,
                pricePerKg: parseFloat(productFormData.pricePerKg),
                availableQty: parseFloat(productFormData.availableQty),
                minOrderQty: parseFloat(productFormData.minOrderQty) || 1,
                isOrganic: productFormData.isOrganic
            });

            setShowProductModal(false);
            setSelectedBatch(null);
            // Navigate to products page
            router.push('/farmer/products');
        } catch (err) {
            setError(err.message || 'Failed to create product');
        } finally {
            setSubmitting(false);
        }
    };

    const getActivityInfo = (activityType) => {
        return ACTIVITY_TYPES.find(a => a.value === activityType) || ACTIVITY_TYPES[0];
    };

    const getCurrentStateInfo = (batch) => {
        if (batch.activities && batch.activities.length > 0) {
            const lastActivity = batch.activities[batch.activities.length - 1];
            return getActivityInfo(lastActivity.activityType);
        }
        return { value: 'NONE', label: 'Not Started', icon: Clock, color: 'bg-gray-100 text-gray-700' };
    };

    const isHarvested = (batch) => {
        // Check if batch has HARVEST activity
        if (batch.activities && batch.activities.length > 0) {
            return batch.activities.some(a => a.activityType === 'HARVEST');
        }
        return false;
    };

    const filteredBatches = batches.filter(batch =>
        batch.cropName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <FarmerLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-10 h-10 animate-spin text-green-600" />
                </div>
            </FarmerLayout>
        );
    }

    return (
        <FarmerLayout>
            <div className="space-y-6">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
                    
                    {/* Blockchain decoration */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                        <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></div>
                        <span className="text-xs font-medium">Blockchain Secured</span>
                        <Link2 className="w-3.5 h-3.5" />
                    </div>
                    
                    <div className="relative flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Package className="w-6 h-6" />
                                </div>
                                <h1 className="text-3xl font-bold">{t('batch_tracking')}</h1>
                            </div>
                            <p className="text-green-100 max-w-md">
                                {t('batch_tracking_description', 'Create and monitor crop batches with blockchain-verified traceability for complete supply chain transparency')}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-200" />
                                    <span className="text-green-100">{filteredBatches.length} {t('total_batches')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-yellow-300" />
                                    <span className="text-green-100">
                                        {filteredBatches.reduce((acc, b) => acc + (b.activities?.filter(a => a.blockchainStatus === 'confirmed').length || 0), 0)} {t('on_chain')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <motion.button
                            onClick={() => { resetForm(); setShowCreateModal(true); }}
                            disabled={farms.length === 0}
                            className="px-6 py-3.5 bg-white text-green-700 rounded-xl font-bold shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: farms.length > 0 ? 1.02 : 1 }}
                            whileTap={{ scale: farms.length > 0 ? 0.98 : 1 }}
                        >
                            <Plus className="w-5 h-5" />
                            {t('create_batch')}
                        </motion.button>
                    </div>
                </div>

                {farms.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
                        ⚠️ Please create a farm first in <strong>Farm Management</strong> before adding batches.
                    </div>
                )}

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                        <input
                            type="text"
                            placeholder={t('search_batches', 'Search batches by crop name or ID...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all"
                        />
                    </div>
                    <button className="px-6 py-3 bg-white border-2 border-stone-200 rounded-xl font-semibold hover:border-green-500 hover:bg-green-50 transition-all flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        {t('filter', 'Filter')}
                    </button>
                </div>

                {/* Batches Grid */}
                {filteredBatches.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-12 text-center">
                        <Sprout className="w-16 h-16 mx-auto mb-4 text-green-600 opacity-50" />
                        <h3 className="text-xl font-bold text-stone-800 mb-2">{t('no_batches_yet', 'No Batches Yet')}</h3>
                        <p className="text-stone-500">{t('create_first_batch', 'Create your first crop batch to start tracking')}</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredBatches.map((batch, index) => {
                            const stateInfo = getCurrentStateInfo(batch);
                            const StateIcon = stateInfo.icon;
                            const harvested = isHarvested(batch);
                            const confirmedCount = batch.activities?.filter(a => a.blockchainStatus === 'confirmed').length || 0;
                            const pendingCount = batch.activities?.filter(a => a.blockchainStatus === 'pending').length || 0;
                            const totalActivities = batch.activities?.length || 0;

                            return (
                                <motion.div
                                    key={batch.id}
                                    className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden hover:shadow-xl transition-shadow group"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                >
                                    {/* Blockchain Status Banner */}
                                    {totalActivities > 0 && (
                                        <div className={`px-6 py-3 flex items-center justify-between ${
                                            confirmedCount === totalActivities 
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                                : pendingCount > 0 
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                    : 'bg-gradient-to-r from-slate-500 to-slate-600'
                                        }`}>
                                            <div className="flex items-center gap-3 text-white">
                                                <div className="p-1.5 bg-white/20 rounded-lg">
                                                    <Link2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-white/80">Blockchain Status</p>
                                                    <p className="text-sm font-bold">
                                                        {confirmedCount === totalActivities 
                                                            ? '✓ Fully Verified On-Chain' 
                                                            : pendingCount > 0 
                                                                ? `⏳ ${pendingCount} Pending Confirmation`
                                                                : 'Partial Verification'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right text-white">
                                                    <p className="text-2xl font-black">{confirmedCount}/{totalActivities}</p>
                                                    <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">On-Chain</p>
                                                </div>
                                                {confirmedCount === totalActivities && (
                                                    <div className="p-2 bg-white/20 rounded-full">
                                                        <Shield className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shadow-sm">
                                                    <Package className="w-8 h-8 text-green-600" strokeWidth={2} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-stone-800 mb-1">{batch.cropName}</h3>
                                                    <p className="text-sm text-stone-500">
                                                        {batch.variety && <span>{batch.variety} • </span>}
                                                        {batch.cropCategory}
                                                    </p>
                                                    <p className="text-xs text-stone-400 mt-1 font-mono">ID: {batch.id.slice(-8)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${stateInfo.color}`}>
                                                    <StateIcon className="w-4 h-4" />
                                                    {batch.stateLabel || stateInfo.label}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(batch.id); }}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                            <div className="flex items-start gap-3">
                                                <Leaf className="w-5 h-5 text-stone-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-stone-500">Seed Source</p>
                                                    <p className="text-sm font-semibold text-stone-800">{batch.seedSource || 'Not specified'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Calendar className="w-5 h-5 text-stone-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-stone-500">Sowing Date</p>
                                                    <p className="text-sm font-semibold text-stone-800">
                                                        {batch.sowingDate ? new Date(batch.sowingDate).toLocaleDateString() : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Calendar className="w-5 h-5 text-stone-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-stone-500">Expected Harvest</p>
                                                    <p className="text-sm font-semibold text-stone-800">
                                                        {batch.expectedHarvestDate ? new Date(batch.expectedHarvestDate).toLocaleDateString() : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <MapPin className="w-5 h-5 text-stone-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-stone-500">Farm Location</p>
                                                    <p className="text-sm font-semibold text-stone-800">
                                                        PIN: {batch.farmInfo?.pinCode || batch.farm}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activities Timeline & Blockchain Proof */}
                                        <div className="mb-6 rounded-xl border border-stone-200 overflow-hidden">
                                            {/* Timeline Header */}
                                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-white">
                                                    <Link2 className="w-4 h-4" />
                                                    <span className="font-bold text-sm">Blockchain Journey Timeline</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); checkOrganicStatus(batch.id); }}
                                                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                                >
                                                    {verifying[batch.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                                                    Verify Organic
                                                </button>
                                            </div>
                                            
                                            <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
                                                {(() => {
                                                    const timelineWarnings = analyzeTimeline(batch.activities || []);
                                                    return timelineWarnings.length > 0 ? (
                                                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                                            <p className="text-sm font-bold text-amber-900">⚠ Timeline Warnings</p>
                                                            <ul className="mt-2 space-y-1">
                                                                {timelineWarnings.map((warning, warningIdx) => (
                                                                    <li key={`${batch.id}-${warning.type}-${warningIdx}`} className="text-xs text-amber-800">
                                                                        • {warning.message}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ) : null;
                                                })()}

                                                <div className="space-y-4 relative pl-2">
                                                    {/* Vertical line connector */}
                                                    <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-300 via-emerald-400 to-slate-200" />
                                                    
                                                    {batch.activities && batch.activities.map((activity, idx) => {
                                                        const info = getActivityInfo(activity.activityType);
                                                        const ActIcon = info.icon;
                                                        const isConfirmed = activity.blockchainStatus === 'confirmed';
                                                        const isPending = activity.blockchainStatus === 'pending';
                                                        
                                                        return (
                                                            <motion.div 
                                                                key={activity.id} 
                                                                className={`relative flex items-start gap-3 p-3 rounded-xl transition-all ${
                                                                    isConfirmed 
                                                                        ? 'bg-emerald-50/50 border border-emerald-100' 
                                                                        : isPending 
                                                                            ? 'bg-amber-50/50 border border-amber-100'
                                                                            : 'bg-white border border-slate-100'
                                                                }`}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                            >
                                                                <div className={`p-2 rounded-xl z-10 ${info.color} ring-4 ring-white shadow-sm`}>
                                                                    <ActIcon className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex flex-wrap items-center justify-between gap-x-2">
                                                                        <p className="text-sm font-bold text-stone-800">{info.label}</p>
                                                                        <span className="text-xs text-stone-400 font-medium">
                                                                            {new Date(activity.date).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                        {/* Blockchain Status Badge - Enhanced */}
                                                                        <span className={`px-2.5 py-1 text-[10px] rounded-lg font-bold flex items-center gap-1.5 ${
                                                                            isConfirmed 
                                                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' 
                                                                                : activity.blockchainStatus === 'failed'
                                                                                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                                                                                    : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                                                                        }`}>
                                                                            {isConfirmed ? (
                                                                                <><CheckCircle2 className="w-3 h-3" /> ON-CHAIN</>
                                                                            ) : activity.blockchainStatus === 'failed' ? (
                                                                                <><AlertCircle className="w-3 h-3" /> FAILED</>
                                                                            ) : (
                                                                                <><Loader2 className="w-3 h-3 animate-spin" /> PENDING</>
                                                                            )}
                                                                        </span>

                                                                        {activity.isOrganic && (
                                                                            <span className="px-2 py-1 text-[10px] rounded-lg font-bold bg-green-100 text-green-700 flex items-center gap-1">
                                                                                <Leaf className="w-3 h-3" /> ORGANIC
                                                                            </span>
                                                                        )}

                                                                        {activity.blockchainTxHash && (
                                                                            <a 
                                                                                href={`https://sepolia.etherscan.io/tx/${activity.blockchainTxHash}`}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="ml-auto px-2 py-1 text-[10px] font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center gap-1 transition-colors"
                                                                            >
                                                                                <ExternalLink className="w-3 h-3" /> View on Etherscan
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {(activity.productName || activity.quantity) && (
                                                                        <p className="text-xs text-stone-600 mt-2 px-2 py-1 bg-white/80 rounded-lg inline-block">
                                                                            {activity.productName && <span className="font-medium">{activity.productName}</span>}
                                                                            {activity.productName && activity.quantity && <span> • </span>}
                                                                            {activity.quantity && <span>{activity.quantity} {activity.activityType === 'WATERING' ? 'L' : 'kg'}</span>}
                                                                        </p>
                                                                    )}

                                                                    {/* Block number for confirmed transactions */}
                                                                    {activity.blockchainBlock && (
                                                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                                                            Block #{activity.blockchainBlock}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                    
                                                    {(!batch.activities || batch.activities.length === 0) && (
                                                        <div className="text-center py-6">
                                                            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                                            <p className="text-sm text-stone-400">No activities recorded yet</p>
                                                            <p className="text-xs text-stone-300">Log your first activity to start building your blockchain trail</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Verification Result Badge */}
                                            {verificationResults[batch.id] && (
                                                <div className={`mx-4 mb-4 rounded-xl border-2 p-4 flex items-start gap-4 ${
                                                    verificationResults[batch.id].verified && verificationResults[batch.id].isOrganic
                                                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' 
                                                        : 'bg-slate-50 border-slate-200'
                                                }`}>
                                                    {verificationResults[batch.id].isOrganic ? (
                                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg text-white">
                                                            <Shield className="w-5 h-5" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 bg-slate-200 rounded-xl text-slate-500">
                                                            <AlertCircle className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h5 className={`text-base font-bold flex items-center gap-2 ${
                                                            verificationResults[batch.id].isOrganic ? 'text-emerald-800' : 'text-stone-600'
                                                        }`}>
                                                            {verificationResults[batch.id].isOrganic ? '✓ Blockchain Verified Organic' : 'Verification Incomplete'}
                                                        </h5>
                                                        <p className="text-sm text-stone-500 mt-1">
                                                            Verified <strong>{verificationResults[batch.id].activityCount}</strong> activities on <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">Ethereum Sepolia</span>
                                                        </p>
                                                    </div>
                                                    {verificationResults[batch.id].isOrganic && (
                                                        <div className="text-right">
                                                            <div className="text-2xl">🌿</div>
                                                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Certified</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="border-t border-stone-100 pt-4 flex flex-wrap gap-3">
                                            <motion.button 
                                                onClick={() => openActivityModal(batch)}
                                                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all text-sm flex items-center gap-2 shadow-md hover:shadow-lg"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Plus className="w-4 h-4" />
                                                Log Activity
                                            </motion.button>
                                            
                                            {/* Add to Product button - only enabled when harvested */}
                                            <motion.button 
                                                onClick={() => openProductModal(batch)}
                                                disabled={!harvested}
                                                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${
                                                    harvested 
                                                        ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 shadow-md hover:shadow-lg' 
                                                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                                }`}
                                                title={harvested ? 'Add to Products' : 'Log HARVEST activity first'}
                                                whileHover={harvested ? { scale: 1.02 } : {}}
                                                whileTap={harvested ? { scale: 0.98 } : {}}
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                                Add to Product
                                            </motion.button>

                                            <motion.button 
                                                onClick={() => openQRModal(batch)}
                                                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg font-semibold hover:bg-stone-200 transition-colors text-sm flex items-center gap-2"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <QrCode className="w-4 h-4" />
                                                QR Code
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Create Batch Modal */}
                <AnimatePresence>
                    {showCreateModal && (
                        <motion.div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                        >
                            <motion.div
                                className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header with Blockchain Badge */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-stone-800">Create New Batch</h2>
                                        <p className="text-sm text-stone-500 mt-1">All activities will be recorded on blockchain</p>
                                    </div>
                                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Blockchain Info Banner */}
                                <div className="mb-6 p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Link2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Blockchain-Enabled Traceability</p>
                                            <p className="text-xs text-slate-300">Every activity logged will be immutably recorded on Ethereum Sepolia</p>
                                        </div>
                                    </div>
                                </div>

                                {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Select Farm *</label>
                                        <select
                                            value={formData.farm}
                                            onChange={(e) => setFormData(prev => ({ ...prev, farm: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                        >
                                            <option value="">Choose a farm</option>
                                            {farms.map(farm => (
                                                <option key={farm.id} value={farm.id}>
                                                    PIN: {farm.pinCode} • {farm.size} Acres • {farm.soilType}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Crop Category *</label>
                                        <select
                                            value={formData.cropCategory}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cropCategory: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                        >
                                            <option value="">Select category</option>
                                            {CROP_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Crop Name *</label>
                                        <input
                                            type="text"
                                            value={formData.cropName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, cropName: e.target.value }))}
                                            required
                                            placeholder="e.g., Organic Tomatoes"
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Variety / Strain</label>
                                        <input
                                            type="text"
                                            value={formData.variety}
                                            onChange={(e) => setFormData(prev => ({ ...prev, variety: e.target.value }))}
                                            placeholder="e.g., Cherry Tomatoes"
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Seed Source</label>
                                        <input
                                            type="text"
                                            value={formData.seedSource}
                                            onChange={(e) => setFormData(prev => ({ ...prev, seedSource: e.target.value }))}
                                            placeholder="e.g., Local Nursery"
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-stone-700 mb-2">Sowing Date *</label>
                                            <input
                                                type="date"
                                                value={formData.sowingDate}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sowingDate: e.target.value }))}
                                                required
                                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-stone-700 mb-2">Expected Harvest</label>
                                            <input
                                                type="date"
                                                value={formData.expectedHarvestDate}
                                                onChange={(e) => setFormData(prev => ({ ...prev, expectedHarvestDate: e.target.value }))}
                                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={submitting} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                                            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : 'Create Batch'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Log Activity Modal */}
                <AnimatePresence>
                    {showActivityModal && selectedBatch && (
                        <motion.div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowActivityModal(false)}
                        >
                            <motion.div
                                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-stone-800">Log Activity</h2>
                                        <p className="text-sm text-stone-500 mt-1">{selectedBatch.cropName}</p>
                                    </div>
                                    <button onClick={() => setShowActivityModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Blockchain Recording Notice */}
                                <div className="mb-6 p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white flex items-center gap-3">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Link2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">This activity will be recorded on blockchain</p>
                                        <p className="text-xs text-emerald-100">Immutable, verifiable, and transparent</p>
                                    </div>
                                </div>

                                {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

                                <form onSubmit={handleLogActivity} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-3">Activity Type *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ACTIVITY_TYPES.map((activity) => {
                                                const Icon = activity.icon;
                                                const isSelected = activityFormData.activityType === activity.value;
                                                return (
                                                    <button
                                                        key={activity.value}
                                                        type="button"
                                                        onClick={() => setActivityFormData(prev => ({ ...prev, activityType: activity.value }))}
                                                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                                                            isSelected 
                                                                ? 'border-green-500 bg-green-50 text-green-700' 
                                                                : 'border-stone-200 hover:border-stone-300'
                                                        }`}
                                                    >
                                                        <Icon className="w-5 h-5" />
                                                        <span className="font-medium">{activity.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {(activityFormData.activityType === 'FERTILIZER' || activityFormData.activityType === 'PESTICIDE') && (
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                                                <input
                                                    type="checkbox"
                                                    id="isOrganicInput"
                                                    checked={activityFormData.isOrganic}
                                                    onChange={(e) => setActivityFormData(prev => ({ ...prev, isOrganic: e.target.checked }))}
                                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                                />
                                                <label htmlFor="isOrganicInput" className="font-semibold text-green-800 flex items-center gap-2 cursor-pointer select-none">
                                                    <Leaf className="w-4 h-4" />
                                                    This is an organic/natural input
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-stone-700 mb-2">
                                                    {activityFormData.activityType === 'FERTILIZER' ? 'Fertilizer Name *' : 'Pesticide Name *'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activityFormData.productName}
                                                    onChange={(e) => setActivityFormData(prev => ({ ...prev, productName: e.target.value }))}
                                                    required
                                                    placeholder={activityFormData.activityType === 'FERTILIZER' 
                                                        ? "e.g., Urea, DAP, NPK, Compost" 
                                                        : "e.g., Neem Oil, Imidacloprid, Bio-pesticide"}
                                                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity for Harvest and Packed */}
                                    {(activityFormData.activityType === 'HARVEST' || activityFormData.activityType === 'PACKED') && (
                                        <div>
                                            <label className="block text-sm font-semibold text-stone-700 mb-2">
                                                {activityFormData.activityType === 'HARVEST' ? 'Harvest Quantity (kg) *' : 'Packed Quantity (kg) *'}
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={activityFormData.quantity}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                                    setActivityFormData(prev => ({ ...prev, quantity: value }));
                                                }}
                                                required
                                                placeholder={activityFormData.activityType === 'HARVEST' ? "e.g., 500" : "e.g., 450"}
                                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                            />
                                            {activityFormData.activityType === 'PACKED' && (() => {
                                                const harvestActivity = selectedBatch.activities?.find(a => a.activityType === 'HARVEST');
                                                const harvestQty = harvestActivity?.quantity || 0;
                                                const packedQty = parseFloat(activityFormData.quantity) || 0;
                                                if (harvestQty > 0 && packedQty > harvestQty) {
                                                    return (
                                                        <p className="text-xs text-red-500 mt-1">
                                                            ⚠️ Packed quantity cannot exceed harvested quantity ({harvestQty} kg)
                                                        </p>
                                                    );
                                                }
                                                if (harvestQty > 0) {
                                                    return (
                                                        <p className="text-xs text-stone-500 mt-1">
                                                            Available from harvest: {harvestQty} kg
                                                        </p>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}

                                    {/* Driver and Vehicle for Shipped */}
                                    {activityFormData.activityType === 'SHIPPED' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-semibold text-stone-700 mb-2">Driver Name *</label>
                                                <input
                                                    type="text"
                                                    value={activityFormData.driverName}
                                                    onChange={(e) => setActivityFormData(prev => ({ ...prev, driverName: e.target.value }))}
                                                    required
                                                    placeholder="e.g., Ramesh Kumar"
                                                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-stone-700 mb-2">Vehicle Number *</label>
                                                <input
                                                    type="text"
                                                    value={activityFormData.vehicleNumber}
                                                    onChange={(e) => setActivityFormData(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                                                    required
                                                    placeholder="e.g., TS 01 AB 1234"
                                                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">
                                            {activityFormData.activityType === 'FERTILIZER' ? 'About the Fertilizer' 
                                                : activityFormData.activityType === 'PESTICIDE' ? 'About the Pesticide'
                                                : activityFormData.activityType === 'SHIPPED' ? 'Delivery Notes'
                                                : 'Notes'}
                                        </label>
                                        <textarea
                                            value={activityFormData.notes}
                                            onChange={(e) => setActivityFormData(prev => ({ ...prev, notes: e.target.value }))}
                                            placeholder={
                                                activityFormData.activityType === 'FERTILIZER' 
                                                    ? "Describe the fertilizer used, quantity applied, method of application, and purpose..."
                                                : activityFormData.activityType === 'PESTICIDE'
                                                    ? "Describe the pesticide used, target pest/disease, dosage, and safety precautions..."
                                                : activityFormData.activityType === 'WATERING'
                                                    ? "Describe the irrigation method, water source, duration..."
                                                : activityFormData.activityType === 'HARVEST'
                                                    ? "Describe the quality grade, any observations..."
                                                : activityFormData.activityType === 'PACKED'
                                                    ? "Describe the packaging type, storage conditions..."
                                                : activityFormData.activityType === 'SHIPPED'
                                                    ? "Destination address, expected delivery date, special handling instructions..."
                                                : "Add any relevant notes about this activity..."
                                            }
                                            rows={3}
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold">
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={
                                                submitting || 
                                                !activityFormData.activityType || 
                                                ((activityFormData.activityType === 'FERTILIZER' || activityFormData.activityType === 'PESTICIDE') && !activityFormData.productName) ||
                                                ((activityFormData.activityType === 'HARVEST' || activityFormData.activityType === 'PACKED') && !activityFormData.quantity) ||
                                                (activityFormData.activityType === 'SHIPPED' && (!activityFormData.driverName || !activityFormData.vehicleNumber)) ||
                                                (activityFormData.activityType === 'PACKED' && (() => {
                                                    const harvestActivity = selectedBatch?.activities?.find(a => a.activityType === 'HARVEST');
                                                    const harvestQty = harvestActivity?.quantity || 0;
                                                    const packedQty = parseFloat(activityFormData.quantity) || 0;
                                                    return harvestQty > 0 && packedQty > harvestQty;
                                                })())
                                            } 
                                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Log Activity'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add to Product Modal */}
                <AnimatePresence>
                    {showProductModal && selectedBatch && (
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProductModal(false)}
                        >
                            <motion.div
                                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-stone-800">Add to Products</h2>
                                        <p className="text-sm text-stone-500 mt-1">{selectedBatch.cropName} - {selectedBatch.cropCategory}</p>
                                    </div>
                                    <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

                                <form onSubmit={handleCreateProduct} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Product Title *</label>
                                        <input
                                            type="text"
                                            value={productFormData.title}
                                            onChange={(e) => setProductFormData(prev => ({ ...prev, title: e.target.value }))}
                                            required
                                            placeholder="e.g., Fresh Organic Tomatoes"
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-purple-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Description</label>
                                        <textarea
                                            value={productFormData.description}
                                            onChange={(e) => setProductFormData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Describe your product..."
                                            rows={3}
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-purple-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-stone-700 mb-2">Price per kg (₹) *</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={productFormData.pricePerKg}
                                                    onChange={(e) => setProductFormData(prev => ({ ...prev, pricePerKg: e.target.value }))}
                                                    required
                                                    placeholder="50"
                                                    className="w-full pl-12 pr-4 py-3 border-2 border-stone-200 rounded-xl focus:border-purple-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-stone-700 mb-2">Available Qty (kg) *</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={productFormData.availableQty}
                                                onChange={(e) => setProductFormData(prev => ({ ...prev, availableQty: e.target.value }))}
                                                required
                                                placeholder="100"
                                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-purple-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-stone-700 mb-2">Min Order Qty (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={productFormData.minOrderQty}
                                            onChange={(e) => setProductFormData(prev => ({ ...prev, minOrderQty: e.target.value }))}
                                            placeholder="1"
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-purple-500 outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="isOrganic"
                                            checked={productFormData.isOrganic}
                                            onChange={(e) => setProductFormData(prev => ({ ...prev, isOrganic: e.target.checked }))}
                                            className="w-5 h-5 text-green-600 rounded"
                                        />
                                        <label htmlFor="isOrganic" className="font-semibold text-green-800 flex items-center gap-2">
                                            <Leaf className="w-5 h-5" />
                                            This is an organic product
                                        </label>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-semibold">
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={submitting} 
                                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : 'Add Product'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* QR Code Modal */}
                <AnimatePresence>
                    {showQRModal && selectedBatch && (
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQRModal(false)}
                        >
                            <motion.div
                                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-stone-800">Scan to Verify</h2>
                                    <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="bg-white p-4 rounded-xl mb-6 flex justify-center border border-stone-100" id="qr-code-node">
                                    <QRCode 
                                        value={`${typeof window !== 'undefined' ? window.location.origin : 'https://farmchain.com'}/verify/${selectedBatch.id}`}
                                        level="H"
                                        size={200}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>

                                {/* URL Display */}
                                <div className="mb-6 p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between gap-2 overflow-hidden">
                                    <p className="text-xs text-stone-500 font-mono truncate text-left">
                                        {`${typeof window !== 'undefined' ? window.location.origin : 'https://farmchain.com'}/verify/${selectedBatch.id}`}
                                    </p>
                                    <button 
                                        onClick={() => {
                                            const url = `${window.location.origin}/verify/${selectedBatch.id}`;
                                            navigator.clipboard.writeText(url);
                                        }}
                                        className="text-stone-400 hover:text-stone-600 p-1"
                                        title="Copy Link"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                    </button>
                                </div>

                                <p className="text-sm text-stone-500 mb-6">
                                    Print this code and stick it on your product packaging. Consumers can scan it to see the blockchain verification.
                                </p>

                                <button 
                                    onClick={handleDownloadQR}
                                    className="w-full px-6 py-3 bg-stone-800 text-white rounded-xl font-semibold hover:bg-stone-900 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Download className="w-5 h-5" />
                                    Download PNG
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </FarmerLayout>
    );
}
