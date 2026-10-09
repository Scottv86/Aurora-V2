import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Store, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Gift, 
  User, 
  Receipt, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  DollarSign, 
  Clock, 
  Tag, 
  Printer,
  Calculator,
  Percent,
  Package,
  Delete,
  RefreshCw,
  FileText,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Button } from '../../components/UI/Primitives';

interface CatalogItem {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  basePrice: number;
  currency: string;
  trackInventory: boolean;
  stockLevel: number;
  reorderPoint: number;
  variants?: any[];
  metadata?: any;
}

interface CartItem {
  id: string; // unique cart line id
  catalogItemId: string;
  variantId?: string | null;
  title: string;
  sku?: string | null;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  discountAmount: number;
  discountPercent?: number;
  taxRate: number;
}

export const PointOfSalePage = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

  // Session & Register State
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(200);
  const [actualCashCount, setActualCashCount] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [zReportData, setZReportData] = useState<any>(null);

  // Catalog State
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Cart Numpad Modal State
  const [selectedCartLineId, setSelectedCartLineId] = useState<string | null>(null);
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  const [numpadMode, setNumpadMode] = useState<'QTY' | 'DISC' | 'PRICE' | 'CUSTOM_ITEM'>('DISC');
  const [numpadInput, setNumpadInput] = useState<string>('');
  const [customItemTitle, setCustomItemTitle] = useState<string>('Custom Charge');

  // Checkout & Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tenderType, setTenderType] = useState<'CASH' | 'CARD' | 'VOUCHER' | 'ON_ACCOUNT'>('CARD');
  const [tenderAmount, setTenderAmount] = useState<number>(0);
  const [cashInputStr, setCashInputStr] = useState<string>('');
  const [tenderVoucherCode, setTenderVoucherCode] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherDetails, setVoucherDetails] = useState<any>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Sales History & Processed Orders State
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [historyScope, setHistoryScope] = useState<'SHIFT' | 'ALL'>('SHIFT');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<any | null>(null);

  // Fullscreen Kiosk Mode State & Ref
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFs) {
        const elem = terminalRef.current || document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
        toast.info('Entered Fullscreen Kiosk Mode (Press Esc to exit)');
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('[POS] Native fullscreen failed, applying full-viewport overlay mode:', err);
      setIsFullscreen(prev => !prev);
    }
  };

  // Barcode scanner buffer
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchSession();
    fetchCatalog();
    fetchCustomers();
    fetchOrders('SHIFT');
  }, [tenant?.id, activeSession?.id]);

  // Global Barcode Scanner Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          handleBarcodeScanned(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items]);

  const handleBarcodeScanned = (code: string) => {
    const matched = items.find(i => 
      i.code.toLowerCase() === code.toLowerCase() || 
      i.variants?.some((v: any) => v.barcode?.toLowerCase() === code.toLowerCase() || v.sku?.toLowerCase() === code.toLowerCase())
    );

    if (matched) {
      addToCart(matched);
      toast.success(`Scanned: ${matched.name}`);
    } else {
      toast.error(`Barcode not found in catalog: ${code}`);
    }
  };

  const fetchSession = async () => {
    try {
      setSessionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pos/sessions/active`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data);
        if (!data) {
          setShowOpenModal(true);
        }
      }
    } catch (err) {
      console.error('[POS] Failed to fetch active session:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        const rawList = Array.isArray(data) ? data : (data.items || data.catalog || []);
        setItems(rawList.filter((i: any) => i.status === 'active'));
      }
    } catch (err) {
      console.error('[POS] Failed to fetch catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations?limit=100`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : (data.parties || data.entities || []);
        setCustomerList(list);
      }
    } catch (err) {
      console.error('[POS] Failed to fetch customers:', err);
    }
  };

  const fetchOrders = async (scope: 'SHIFT' | 'ALL' = historyScope) => {
    if (!tenant?.id) return;
    try {
      setLoadingOrders(true);
      let url = `${API_BASE_URL}/api/pos/orders?limit=100`;
      if (scope === 'SHIFT' && activeSession?.id) {
        url += `&sessionId=${encodeURIComponent(activeSession.id)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        setSalesOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('[POS] Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenShift = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pos/registers`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const registers = await res.json();
      const regList = Array.isArray(registers) ? registers : (registers.registers || []);
      const regId = regList?.[0]?.id;

      if (!regId) throw new Error('No register found');

      const openRes = await fetch(`${API_BASE_URL}/api/pos/sessions/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          registerId: regId,
          openingFloat: Number(openingFloat)
        })
      });

      const sessionData = await openRes.json();
      if (openRes.ok) {
        setActiveSession(sessionData);
        setShowOpenModal(false);
        toast.success(`Register shift opened with $${Number(openingFloat).toFixed(2)} float`);
      } else {
        throw new Error(sessionData.error || 'Failed to open shift');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCloseShift = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/pos/sessions/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          sessionId: activeSession.id,
          actualCashCount: Number(actualCashCount),
          notes: closeNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setZReportData(data.zReport);
        setActiveSession(null);
        setShowCloseModal(false);
        toast.success('Shift closed. Z-Report generated.');
      } else {
        throw new Error(data.error || 'Failed to close shift');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addToCart = (item: CatalogItem, variant?: any) => {
    const lineId = variant ? `${item.id}-${variant.id}` : item.id;
    const price = variant?.priceOverride ? Number(variant.priceOverride) : Number(item.basePrice);

    setCart(prev => {
      const existing = prev.find(line => line.id === lineId);
      if (existing) {
        const nextQty = existing.quantity + 1;
        const newDiscount = existing.discountPercent !== undefined && existing.discountPercent > 0
          ? Math.round((nextQty * existing.unitPrice * (existing.discountPercent / 100)) * 100) / 100
          : existing.discountAmount;
        return prev.map(line => line.id === lineId ? { ...line, quantity: nextQty, discountAmount: newDiscount } : line);
      }
      return [
        ...prev,
        {
          id: lineId,
          catalogItemId: item.id,
          variantId: variant?.id || null,
          title: variant ? `${item.name} (${variant.title})` : item.name,
          sku: variant?.sku || item.code,
          unitPrice: price,
          unitCost: Number(variant?.unitCost || 0),
          quantity: 1,
          discountAmount: 0,
          discountPercent: 0,
          taxRate: 0.10 // 10% GST
        }
      ];
    });
  };

  const updateCartQty = (lineId: string, delta: number) => {
    setCart(prev => prev.map(line => {
      if (line.id === lineId) {
        const newQty = line.quantity + delta;
        if (newQty <= 0) return null;
        let newDiscount = line.discountAmount;
        if (line.discountPercent !== undefined && line.discountPercent > 0) {
          newDiscount = Math.round((newQty * line.unitPrice * (line.discountPercent / 100)) * 100) / 100;
        }
        return { ...line, quantity: newQty, discountAmount: newDiscount };
      }
      return line;
    }).filter(Boolean) as CartItem[]);
  };

  const removeCartLine = (lineId: string) => {
    setCart(prev => prev.filter(line => line.id !== lineId));
    if (selectedCartLineId === lineId) {
      setSelectedCartLineId(null);
    }
  };

  const setCartLineQty = (lineId: string, exactQty: number) => {
    if (exactQty <= 0) {
      removeCartLine(lineId);
      return;
    }
    setCart(prev => prev.map(line => {
      if (line.id === lineId) {
        let newDiscount = line.discountAmount;
        if (line.discountPercent !== undefined && line.discountPercent > 0) {
          newDiscount = Math.round((exactQty * line.unitPrice * (line.discountPercent / 100)) * 100) / 100;
        }
        return { ...line, quantity: exactQty, discountAmount: newDiscount };
      }
      return line;
    }));
  };

  const setCartLineDiscount = (lineId: string, percent: number) => {
    setCart(prev => prev.map(line => {
      if (line.id === lineId) {
        const totalLineGross = line.quantity * line.unitPrice;
        const discountAmt = Math.round((totalLineGross * (percent / 100)) * 100) / 100;
        return { ...line, discountAmount: discountAmt, discountPercent: percent };
      }
      return line;
    }));
  };

  const setCartLinePrice = (lineId: string, newUnitPrice: number) => {
    const validPrice = Math.max(0, newUnitPrice);
    setCart(prev => prev.map(line => {
      if (line.id === lineId) {
        let newDiscount = line.discountAmount;
        if (line.discountPercent !== undefined && line.discountPercent > 0) {
          newDiscount = Math.round((line.quantity * validPrice * (line.discountPercent / 100)) * 100) / 100;
        }
        return { ...line, unitPrice: validPrice, discountAmount: newDiscount };
      }
      return line;
    }));
  };

  const addCustomCharge = (amount: number, label = 'Custom Item') => {
    if (amount <= 0) return;
    const customLineId = `custom-${Date.now()}`;
    setCart(prev => [
      ...prev,
      {
        id: customLineId,
        catalogItemId: 'custom',
        variantId: null,
        title: label,
        sku: 'CUSTOM-CHARGE',
        unitPrice: amount,
        unitCost: 0,
        quantity: 1,
        discountAmount: 0,
        taxRate: 0.10
      }
    ]);
    setSelectedCartLineId(customLineId);
    toast.success(`Added $${amount.toFixed(2)} ${label} to cart`);
  };

  const openNumpadModal = (mode: 'QTY' | 'DISC' | 'PRICE' | 'CUSTOM_ITEM', lineId?: string) => {
    if (mode !== 'CUSTOM_ITEM' && cart.length === 0) {
      toast.error('Add items to cart first');
      return;
    }
    const targetId = lineId || selectedCartLineId || (cart.length > 0 ? cart[cart.length - 1].id : null);
    if (lineId) {
      setSelectedCartLineId(lineId);
    } else if (targetId) {
      setSelectedCartLineId(targetId);
    }
    setNumpadMode(mode);
    setNumpadInput('');
    if (mode === 'CUSTOM_ITEM') {
      setCustomItemTitle('Custom Charge');
    }
    setShowNumpadModal(true);
  };

  const handleNumpadTap = (char: string) => {
    if (char === 'CLEAR') {
      setNumpadInput('');
    } else if (char === 'BACKSPACE') {
      setNumpadInput(prev => prev.slice(0, -1));
    } else if (char === '.') {
      if (!numpadInput.includes('.')) {
        setNumpadInput(prev => (prev || '0') + '.');
      }
    } else if (char === '00') {
      if (numpadInput) {
        setNumpadInput(prev => prev + '00');
      }
    } else {
      setNumpadInput(prev => prev + char);
    }
  };

  const handleNumpadPreset = (val: number) => {
    setNumpadInput(val.toString());
  };

  const applyNumpadAction = () => {
    const num = parseFloat(numpadInput);
    if (isNaN(num)) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (numpadMode === 'CUSTOM_ITEM') {
      addCustomCharge(num, customItemTitle.trim() || 'Custom Charge');
      setNumpadInput('');
      setShowNumpadModal(false);
      return;
    }

    if (!selectedCartLineId) {
      toast.error('Select an item in the cart first');
      return;
    }

    const targetLine = cart.find(l => l.id === selectedCartLineId);
    if (!targetLine) {
      toast.error('Target item not found in cart');
      return;
    }

    if (numpadMode === 'QTY') {
      const qty = Math.max(1, Math.round(num));
      setCartLineQty(selectedCartLineId, qty);
      toast.success(`Updated ${targetLine.title} quantity to ${qty}`);
    } else if (numpadMode === 'DISC') {
      const discPercent = Math.min(100, Math.max(0, num));
      setCartLineDiscount(selectedCartLineId, discPercent);
      toast.success(`Applied ${discPercent}% discount to ${targetLine.title}`);
    } else if (numpadMode === 'PRICE') {
      const pr = Math.max(0, num);
      setCartLinePrice(selectedCartLineId, pr);
      toast.success(`Updated unit price to $${pr.toFixed(2)}`);
    }

    setNumpadInput('');
    setShowNumpadModal(false);
  };

  // Keyboard shortcut listener for active numpad modal
  useEffect(() => {
    if (!showNumpadModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on a text input (e.g. customItemTitle input), let default typing work
      if ((e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'text') {
        if (e.key === 'Escape') {
          setShowNumpadModal(false);
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setNumpadInput(prev => prev + e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        setNumpadInput(prev => prev.includes('.') ? prev : (prev || '0') + '.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setNumpadInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        applyNumpadAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowNumpadModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNumpadModal, numpadInput, selectedCartLineId, numpadMode, customItemTitle]);

  // Cash Tender Register Numpad Handlers
  const handleCashKeypadDigit = (digit: string) => {
    let nextStr = cashInputStr;
    if (nextStr === '0' || nextStr === '') {
      if (digit === '.') {
        nextStr = '0.';
      } else {
        nextStr = digit;
      }
    } else {
      if (digit === '.') {
        if (!nextStr.includes('.')) {
          nextStr = nextStr + '.';
        }
      } else if (digit === '00') {
        if (!nextStr.includes('.')) {
          nextStr = nextStr + '00';
        } else if ((nextStr.split('.')[1] || '').length === 0) {
          nextStr = nextStr + '00';
        }
      } else {
        if (nextStr.includes('.')) {
          const parts = nextStr.split('.');
          if (parts[1].length < 2) {
            nextStr = nextStr + digit;
          }
        } else {
          nextStr = nextStr + digit;
        }
      }
    }
    setCashInputStr(nextStr);
    const parsed = parseFloat(nextStr);
    setTenderAmount(isNaN(parsed) ? 0 : parsed);
  };

  const handleCashKeypadBackspace = () => {
    const nextStr = cashInputStr.slice(0, -1);
    setCashInputStr(nextStr);
    const parsed = parseFloat(nextStr);
    setTenderAmount(isNaN(parsed) ? 0 : parsed);
  };

  const handleCashPreset = (amount: number) => {
    setTenderAmount(amount);
    setCashInputStr(amount.toFixed(2));
  };

  const handleCashIncrement = (inc: number) => {
    const next = Math.round((tenderAmount + inc) * 100) / 100;
    setTenderAmount(next);
    setCashInputStr(next.toFixed(2));
  };

  const handleCashClear = () => {
    setTenderAmount(0);
    setCashInputStr('');
  };

  // Cart Totals Calculations
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const line of cart) {
      const lineSubtotal = (line.quantity * line.unitPrice) - line.discountAmount;
      const lineTax = Math.round((lineSubtotal * line.taxRate) * 100) / 100;
      subtotal += line.quantity * line.unitPrice;
      discountTotal += line.discountAmount;
      taxTotal += lineTax;
    }

    const total = Math.max(0, Math.round((subtotal - discountTotal + taxTotal) * 100) / 100);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total
    };
  }, [cart]);

  const handleLookupVoucher = async () => {
    if (!tenderVoucherCode.trim()) return;
    try {
      setValidatingVoucher(true);
      const res = await fetch(`${API_BASE_URL}/api/vouchers/lookup/${encodeURIComponent(tenderVoucherCode.trim())}`, {
        headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      if (res.ok) {
        setVoucherDetails(data);
        const applyAmount = Math.min(Number(data.currentBalance), cartTotals.total);
        setTenderAmount(applyAmount);
        toast.success(`Voucher valid! Balance: $${Number(data.currentBalance).toFixed(2)}`);
      } else {
        throw new Error(data.error || 'Voucher invalid or expired');
      }
    } catch (err: any) {
      toast.error(err.message);
      setVoucherDetails(null);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!activeSession) {
      toast.error('No active register session');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setIsProcessingOrder(true);

      const changeGiven = tenderType === 'CASH' && tenderAmount > cartTotals.total
        ? Math.round((tenderAmount - cartTotals.total) * 100) / 100
        : 0;

      const payload = {
        sessionId: activeSession.id,
        customerPartyId: selectedCustomer?.id || null,
        items: cart.map(item => ({
          catalogItemId: item.catalogItemId,
          variantId: item.variantId,
          title: item.title,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          discountAmount: item.discountAmount,
          taxRate: item.taxRate
        })),
        payments: [
          {
            tenderType,
            amount: tenderType === 'CASH' ? tenderAmount : cartTotals.total,
            changeGiven,
            voucherCode: tenderType === 'VOUCHER' ? tenderVoucherCode.trim() : null
          }
        ]
      };

      const res = await fetch(`${API_BASE_URL}/api/pos/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      const orderData = await res.json();
      if (res.ok) {
        setCompletedOrder(orderData);
        setCart([]);
        setSelectedCustomer(null);
        setShowPaymentModal(false);
        setVoucherDetails(null);
        setTenderVoucherCode('');
        toast.success(`Order ${orderData.orderNumber} completed successfully!`);
        // Refresh catalog for updated stock and orders list
        fetchCatalog();
        fetchOrders(historyScope);
        fetchSession();
      } else {
        throw new Error(orderData.error || 'Failed to complete order');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Dynamic Categories extracted from catalog items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(i => {
      const c = (i as any).metadata?.category?.trim();
      if (c) cats.add(c);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasUncategorizedItems = useMemo(() => {
    return items.some(i => !(i as any).metadata?.category?.trim());
  }, [items]);

  // Category navigation tabs (industry-agnostic, derived dynamically from items)
  const categoryTabs = useMemo(() => {
    if (availableCategories.length > 0) {
      const tabs = [
        { id: 'ALL', label: 'All Items', count: items.length },
        ...availableCategories.map(cat => ({
          id: `CAT:${cat}`,
          label: cat,
          count: items.filter(i => ((i as any).metadata?.category?.trim() || '').toLowerCase() === cat.toLowerCase()).length
        }))
      ];
      if (hasUncategorizedItems) {
        tabs.push({
          id: 'UNCATEGORIZED',
          label: 'General / Other',
          count: items.filter(i => !(i as any).metadata?.category?.trim()).length
        });
      }
      return tabs;
    }

    // Default fallback when items have no custom category tags
    return [
      { id: 'ALL', label: 'All Items', count: items.length },
      { id: 'PRODUCT', label: 'Products', count: items.filter(i => i.type === 'PRODUCT').length },
      { id: 'SERVICE', label: 'Services', count: items.filter(i => i.type === 'SERVICE').length },
      { id: 'FEE', label: 'Fees', count: items.filter(i => i.type === 'FEE').length },
      { id: 'RECURRING', label: 'Subscriptions', count: items.filter(i => i.type === 'RECURRING').length },
    ].filter(t => t.id === 'ALL' || t.count > 0);
  }, [items, availableCategories, hasUncategorizedItems]);

  // Filter Catalog
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const itemCategory = ((item as any).metadata?.category || '').trim();
      const matchesSearch = q === '' || 
        item.name.toLowerCase().includes(q) || 
        item.code.toLowerCase().includes(q) ||
        itemCategory.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      let matchesCategory = true;
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'UNCATEGORIZED') {
          matchesCategory = !itemCategory;
        } else if (selectedCategory.startsWith('CAT:')) {
          const targetCat = selectedCategory.slice(4).toLowerCase();
          matchesCategory = itemCategory.toLowerCase() === targetCat;
        } else {
          matchesCategory = item.type === selectedCategory;
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Filter Sales Orders
  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(order => {
      const q = historySearch.toLowerCase().trim();
      if (!q) return true;
      const orderNum = (order.orderNumber || '').toLowerCase();
      const customerName = (
        order.customer?.organization?.legalName || 
        `${order.customer?.person?.firstName || ''} ${order.customer?.person?.lastName || ''}`
      ).toLowerCase();
      const itemMatch = (order.items || []).some((i: any) => 
        (i.title || '').toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q)
      );
      return orderNum.includes(q) || customerName.includes(q) || itemMatch;
    });
  }, [salesOrders, historySearch]);

  const shiftSalesTotal = useMemo(() => {
    return salesOrders
      .filter(o => !activeSession || o.sessionId === activeSession.id)
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [salesOrders, activeSession]);

  const formatOrderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getTenderBadge = (type: string) => {
    switch (type) {
      case 'CASH':
        return { label: 'Cash', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'CARD':
        return { label: 'Card', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'VOUCHER':
        return { label: 'Voucher', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'ON_ACCOUNT':
        return { label: 'On-Account', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      default:
        return { label: type, color: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1 min-h-0 bg-zinc-950 text-zinc-100">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-zinc-400 font-mono">Initializing Point of Sale Terminal...</p>
      </div>
    );
  }

  return (
    <div
      ref={terminalRef}
      className={cn(
        "flex flex-col bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden",
        isFullscreen 
          ? "fixed inset-0 z-[99999] w-screen h-screen" 
          : "h-full flex-1 min-h-0"
      )}
    >
      {/* POS Top Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Store size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Point of Sale</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activeSession ? 'Shift Active' : 'Shift Closed'}
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              {activeSession 
                ? `${activeSession.register?.name} • Float: $${Number(activeSession.openingFloat).toFixed(2)} • Sales: ${salesOrders.length} ($${shiftSalesTotal.toFixed(2)})` 
                : 'Open a shift to start ringing sales'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manage Catalog Button */}
          <a
            href="/workspace/settings/platform-modules/pricing-catalog"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Pricing Catalog in a new tab to add, edit, or delete items"
            className="h-8 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
          >
            <Tag size={14} className="text-zinc-400" />
            <span>Manage Catalog</span>
          </a>

          {/* Sales History Button */}
          <button
            type="button"
            onClick={() => {
              setShowSalesHistory(true);
              fetchOrders(historyScope);
            }}
            className="h-8 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
          >
            <Receipt size={14} className="text-zinc-400" />
            <span>Sales History</span>
            {salesOrders.length > 0 && (
              <span className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] rounded-full font-mono font-medium border border-zinc-600/50">
                {salesOrders.length}
              </span>
            )}
          </button>

          {activeSession ? (
            <button
              type="button"
              onClick={() => {
                setActualCashCount(Number(activeSession.openingFloat));
                setShowCloseModal(true);
              }}
              className="h-8 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
            >
              <Clock size={14} className="text-zinc-400" />
              <span>Close Shift (Z-Report)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenModal(true)}
              className="h-8 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
            >
              <Plus size={14} className="text-zinc-400" />
              <span>Open Register Shift</span>
            </button>
          )}

          {/* Fullscreen / Minimise Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc or F11)" : "Enter Fullscreen (F11)"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="h-8 w-8 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-all shadow-sm shrink-0"
          >
            {isFullscreen ? <Minimize2 size={14} className="text-zinc-400" /> : <Maximize2 size={14} className="text-zinc-400" />}
          </button>
        </div>
      </header>

      {/* Main Workspace: 2-Column Split */}
      <div className="flex-1 min-h-0 flex overflow-hidden w-full">
        {/* Left Column (65%): Catalog Grid */}
        <div className="w-[65%] border-r border-zinc-800 flex flex-col bg-zinc-900/30 min-h-0 h-full">
          {/* Search & Category Pills */}
          <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-900/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search catalog or scan barcode (hotkey: /)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categoryTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                    selectedCategory === tab.id 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold" 
                      : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    selectedCategory === tab.id ? "bg-white/20 text-white font-bold" : "bg-zinc-700/60 text-zinc-400"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Item Grid */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto">
            {catalogLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                Loading catalog items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs gap-3 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
                  <Tag size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-300">No items available</p>
                  <p className="text-xs text-zinc-500 max-w-sm mt-0.5">
                    {searchQuery 
                      ? `No items match "${searchQuery}".` 
                      : 'Add items, prices, and stock in the Pricing Catalog to sell them on this register.'}
                  </p>
                </div>
                <a
                  href="/workspace/settings/platform-modules/pricing-catalog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Open Pricing Catalog</span>
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map(item => {
                  const isOutOfStock = item.trackInventory && item.stockLevel <= 0;
                  const isLowStock = item.trackInventory && item.stockLevel > 0 && item.stockLevel <= item.reorderPoint;
                  const hasImage = Boolean((item as any).metadata?.imageUrl);

                  const categoryTheme = {
                    PRODUCT: { bg: 'from-emerald-500/15 via-teal-500/10 to-zinc-900 text-emerald-400 border-emerald-500/20', icon: Package },
                    SERVICE: { bg: 'from-indigo-500/15 via-blue-500/10 to-zinc-900 text-indigo-400 border-indigo-500/20', icon: Clock },
                    FEE: { bg: 'from-amber-500/15 via-orange-500/10 to-zinc-900 text-amber-400 border-amber-500/20', icon: Tag },
                    RECURRING: { bg: 'from-purple-500/15 via-pink-500/10 to-zinc-900 text-purple-400 border-purple-500/20', icon: Store },
                  }[item.type] || { bg: 'from-zinc-800 to-zinc-900 text-zinc-400 border-zinc-700', icon: Package };
                  const CategoryIcon = categoryTheme.icon;

                  return (
                    <motion.div
                      key={item.id}
                      whileTap={{ scale: isOutOfStock ? 1 : 0.96 }}
                      onClick={() => {
                        if (isOutOfStock) {
                          toast.error(`${item.name} is currently sold out`);
                          return;
                        }
                        addToCart(item);
                      }}
                      className={cn(
                        "rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group select-none shadow-sm",
                        isOutOfStock 
                          ? "opacity-50 bg-zinc-900/60 border-zinc-800 cursor-not-allowed" 
                          : "bg-zinc-900/90 border-zinc-800/90 hover:border-indigo-500/60 hover:shadow-indigo-500/10 cursor-pointer"
                      )}
                    >
                      {/* Top Thumbnail Media Area */}
                      <div className="relative w-full h-28 bg-zinc-950 overflow-hidden shrink-0 border-b border-zinc-800/60">
                        {hasImage ? (
                          <img
                            src={(item as any).metadata.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className={cn("w-full h-full flex flex-col items-center justify-center bg-gradient-to-br", categoryTheme.bg)}>
                            <CategoryIcon size={32} className="opacity-80 group-hover:scale-110 transition-transform duration-300" />
                            <span className="text-[10px] font-bold tracking-wider mt-1 opacity-90 px-2 py-0.5 rounded-full bg-black/40 text-center max-w-[90%] truncate">
                              {(item as any).metadata?.category || item.type}
                            </span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                          <div className="flex items-center gap-1 max-w-[68%]">
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-zinc-300 font-bold border border-white/10 shrink-0">
                              {item.code}
                            </span>
                            {(item as any).metadata?.category && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-md text-white font-sans border border-indigo-500/30 shadow-sm truncate">
                                {(item as any).metadata.category}
                              </span>
                            )}
                          </div>

                          {item.trackInventory && (
                            <span className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold backdrop-blur-md border shrink-0",
                              isOutOfStock
                                ? "bg-rose-500/90 text-white border-rose-500"
                                : isLowStock
                                  ? "bg-amber-500/90 text-white border-amber-500"
                                  : "bg-emerald-500/90 text-white border-emerald-500"
                            )}>
                              {isOutOfStock ? 'Sold Out' : `${item.stockLevel} left`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content & Price */}
                      <div className="p-3 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            {(item as any).metadata?.category ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 max-w-[130px] truncate">
                                {(item as any).metadata.category}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                                {item.type}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                            {item.name}
                          </h3>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/60">
                          <span className="text-xs font-mono font-extrabold text-white bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
                            ${Number(item.basePrice).toFixed(2)}
                          </span>
                          <div className="w-6 h-6 rounded-lg bg-zinc-800 group-hover:bg-indigo-600 text-zinc-400 group-hover:text-white flex items-center justify-center transition-colors">
                            <Plus size={14} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (35%): Interactive Cart */}
        <div className="w-[35%] flex flex-col bg-zinc-950 min-h-0 h-full border-l border-zinc-800/80">
          {/* Customer Bar */}
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
            {selectedCustomer ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs font-bold">
                  {selectedCustomer.person?.firstName?.charAt(0) || selectedCustomer.organization?.legalName?.charAt(0) || 'C'}
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-bold text-white">
                    {selectedCustomer.organization?.legalName || `${selectedCustomer.person?.firstName || ''} ${selectedCustomer.person?.lastName || ''}`.trim()}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">Linked Customer</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="ml-2 text-zinc-500 hover:text-rose-400 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerPicker(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-700/80 hover:border-indigo-500/80 rounded-xl text-zinc-400 hover:text-indigo-400 text-xs font-medium transition-colors cursor-pointer"
              >
                <User size={14} />
                <span>+ Link Customer Profile (Party)</span>
              </button>
            )}
          </div>

          {/* Cart Header */}
          <div className="px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-300">
                Cart ({cart.reduce((s, l) => s + l.quantity, 0)} {cart.reduce((s, l) => s + l.quantity, 0) === 1 ? 'item' : 'items'})
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[10px] text-zinc-500 hover:text-rose-400 font-medium transition-colors cursor-pointer"
                  title="Empty cart"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Cart Item List - ALWAYS VISIBLE */}
          <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 text-xs">
                <Receipt size={32} className="text-zinc-700" />
                <p>Cart is empty. Tap items or scan barcodes.</p>
              </div>
            ) : (
              cart.map(line => (
                <div
                  key={line.id}
                  onClick={() => setSelectedCartLineId(line.id)}
                  className={cn(
                    "p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer",
                    selectedCartLineId === line.id
                      ? "bg-zinc-900 border-indigo-500/80 shadow-sm shadow-indigo-500/10"
                      : "bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-white truncate">{line.title}</p>
                      {selectedCartLineId === line.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" title="Selected item" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openNumpadModal('PRICE', line.id);
                        }}
                        className="hover:text-indigo-400 hover:underline cursor-pointer"
                        title="Click to override unit price"
                      >
                        ${line.unitPrice.toFixed(2)} ea
                      </button>

                      {line.discountAmount > 0 ? (() => {
                        const lineGross = line.quantity * line.unitPrice;
                        const linePct = line.discountPercent !== undefined && line.discountPercent > 0
                          ? line.discountPercent
                          : (lineGross > 0 ? Math.round((line.discountAmount / lineGross) * 100) : 0);

                        return (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openNumpadModal('DISC', line.id);
                            }}
                            className="text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20 cursor-pointer inline-flex items-center gap-1 font-mono text-[11px] transition-colors"
                            title="Click to edit discount"
                          >
                            <span>{linePct}% off</span>
                            <span className="opacity-80">(-${line.discountAmount.toFixed(2)})</span>
                          </button>
                        );
                      })() : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openNumpadModal('DISC', line.id);
                          }}
                          className="text-[10px] text-zinc-500 hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer opacity-70 hover:opacity-100"
                          title="Add item discount"
                        >
                          <Percent size={10} />
                          <span>Disc</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-zinc-800 rounded-lg border border-zinc-700/50 p-0.5">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          updateCartQty(line.id, -1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openNumpadModal('QTY', line.id);
                        }}
                        className="w-6 text-center text-xs font-bold text-white hover:text-indigo-400 cursor-pointer"
                        title="Click to enter quantity with numpad"
                      >
                        {line.quantity}
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          updateCartQty(line.id, 1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-white w-14 text-right font-mono">
                      ${((line.quantity * line.unitPrice) - line.discountAmount).toFixed(2)}
                    </span>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeCartLine(line.id);
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Action Keypad Toolbar */}
          <div className="grid grid-cols-4 gap-1.5 px-3 py-2 bg-zinc-950/60 border-t border-zinc-800/80">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => openNumpadModal('DISC')}
              className="py-1.5 px-1 bg-zinc-850 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold border border-zinc-750 flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Apply discount to cart item"
            >
              <Percent size={11} className="text-emerald-400" />
              <span>Disc %</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => openNumpadModal('QTY')}
              className="py-1.5 px-1 bg-zinc-850 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold border border-zinc-750 flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Adjust quantity of cart item"
            >
              <Calculator size={11} className="text-blue-400" />
              <span>Qty</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => openNumpadModal('PRICE')}
              className="py-1.5 px-1 bg-zinc-850 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold border border-zinc-750 flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Override unit price of cart item"
            >
              <DollarSign size={11} className="text-amber-400" />
              <span>Price</span>
            </button>
            <button
              type="button"
              onClick={() => openNumpadModal('CUSTOM_ITEM')}
              className="py-1.5 px-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold border border-zinc-750 flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Add custom / open charge item"
            >
              <Plus size={11} className="text-indigo-400" />
              <span>Custom</span>
            </button>
          </div>

          {/* Cart Summary & Action Bar */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-zinc-200 font-mono">${cartTotals.subtotal.toFixed(2)}</span>
              </div>
              {cartTotals.discountTotal > 0 && (() => {
                const overallPct = cartTotals.subtotal > 0
                  ? Math.round((cartTotals.discountTotal / cartTotals.subtotal) * 100)
                  : 0;

                return (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>Discounts</span>
                      {overallPct > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          {overallPct}%
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold">-${cartTotals.discountTotal.toFixed(2)}</span>
                  </div>
                );
              })()}
              <div className="flex justify-between">
                <span>GST (10% inc.)</span>
                <span className="text-zinc-200 font-mono">${cartTotals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-base font-extrabold text-white">
                <span>Total Due</span>
                <span className="text-emerald-400 font-mono">${cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                disabled={cart.length === 0}
                onClick={() => setCart([])}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2.5 rounded-xl border border-zinc-700 cursor-pointer disabled:opacity-40"
              >
                Clear Cart
              </Button>
              <Button
                disabled={cart.length === 0 || !activeSession}
                onClick={() => {
                  setTenderAmount(cartTotals.total);
                  setCashInputStr(cartTotals.total.toFixed(2));
                  setShowPaymentModal(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <DollarSign size={16} />
                <span>Charge ${cartTotals.total.toFixed(2)}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Open Register Shift */}
      <AnimatePresence>
        {showOpenModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Store size={18} className="text-indigo-400" />
                  <span>Open Register Shift</span>
                </div>
                {activeSession && (
                  <button onClick={() => setShowOpenModal(false)} className="text-zinc-500 hover:text-white">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400">
                  Opening Till Cash Float ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={openingFloat}
                  onChange={e => setOpeningFloat(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500">
                  Input the physical cash bills and coins in the till drawer prior to opening the register.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  onClick={handleOpenShift}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer"
                >
                  Confirm & Open Register
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Close Register Shift (Blind Cash Count & Z-Report) */}
      <AnimatePresence>
        {showCloseModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Clock size={18} className="text-amber-400" />
                  <span>Close Register Shift (Z-Report)</span>
                </div>
                <button onClick={() => setShowCloseModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400">
                  Actual Physical Cash Counted ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCashCount}
                  onChange={e => setActualCashCount(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-zinc-500">
                  Count the cash drawer blindly. The system will compute drawer variance and post discrepancies to the General Ledger.
                </p>

                <label className="text-xs font-medium text-zinc-400 block pt-1">
                  Shift Notes / Handover
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional shift notes..."
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  onClick={() => setShowCloseModal(false)}
                  className="bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseShift}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Complete Shift Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Payment Checkout Drawer */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <CreditCard size={18} className="text-emerald-400" />
                  <span>Complete Checkout: ${cartTotals.total.toFixed(2)}</span>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Tender Type Tabs */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'CARD', label: 'Card / Terminal', icon: CreditCard },
                  { id: 'CASH', label: 'Cash Drawer', icon: Banknote },
                  { id: 'VOUCHER', label: 'Gift Voucher', icon: Gift },
                  { id: 'ON_ACCOUNT', label: 'On-Account', icon: User }
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTenderType(t.id as any);
                        if (t.id === 'CASH' && (!tenderAmount || tenderAmount === 0)) {
                          setTenderAmount(cartTotals.total);
                          setCashInputStr(cartTotals.total.toFixed(2));
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer",
                        tenderType === t.id
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tender Content */}
              {tenderType === 'CASH' && (
                <div className="space-y-3.5 p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800">
                  {/* Tendered & Change Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-400 font-medium">Cash Tendered</span>
                        {cashInputStr && (
                          <button
                            type="button"
                            onClick={handleCashClear}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 font-mono text-lg font-bold">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={cashInputStr || (tenderAmount > 0 ? tenderAmount.toString() : '')}
                          placeholder="0.00"
                          onChange={e => {
                            const val = e.target.value;
                            setCashInputStr(val);
                            const parsed = parseFloat(val);
                            setTenderAmount(isNaN(parsed) ? 0 : parsed);
                          }}
                          className="w-full bg-transparent text-xl font-mono font-black text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className={cn(
                      "border rounded-xl p-3 flex flex-col justify-center transition-all",
                      tenderAmount >= cartTotals.total
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                    )}>
                      <span className={cn(
                        "text-[11px] font-medium block",
                        tenderAmount >= cartTotals.total ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {tenderAmount >= cartTotals.total ? 'Change Due' : 'Remaining Due'}
                      </span>
                      <span className={cn(
                        "text-xl font-mono font-black mt-0.5",
                        tenderAmount >= cartTotals.total ? "text-emerald-300" : "text-amber-300"
                      )}>
                        ${tenderAmount >= cartTotals.total
                          ? (tenderAmount - cartTotals.total).toFixed(2)
                          : (cartTotals.total - tenderAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Fast Currency Bill Presets */}
                  <div>
                    <div className="text-[11px] font-semibold text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Quick Bill Presets</span>
                      <span className="text-zinc-500 text-[10px]">Tap to tender note</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCashPreset(cartTotals.total)}
                        className="py-2 px-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer truncate"
                      >
                        Exact
                      </button>
                      {[20, 50, 100].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleCashPreset(amt)}
                          className={cn(
                            "py-2 px-1 border rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center",
                            tenderAmount === amt
                              ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                              : "bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-200"
                          )}
                        >
                          ${amt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleCashIncrement(10)}
                        className="py-2 px-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center"
                      >
                        +$10
                      </button>
                    </div>
                  </div>

                  {/* Dedicated Touch Register Numpad Grid */}
                  <div>
                    <div className="text-[11px] font-semibold text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Touch Register Keypad</span>
                      <span className="text-zinc-500 text-[10px]">Tap keys to enter cash</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['1', '2', '3'].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleCashKeypadDigit(k)}
                          className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-base font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleCashClear}
                        className="py-2.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
                      >
                        CLEAR
                      </button>

                      {['4', '5', '6'].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleCashKeypadDigit(k)}
                          className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-base font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleCashIncrement(20)}
                        className="py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer text-center"
                      >
                        +$20
                      </button>

                      {['7', '8', '9'].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleCashKeypadDigit(k)}
                          className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-base font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleCashKeypadBackspace}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-base font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                      >
                        <Delete size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCashKeypadDigit('.')}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-base font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                      >
                        .
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashKeypadDigit('0')}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-base font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashKeypadDigit('00')}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-sm font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                      >
                        00
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashIncrement(50)}
                        className="py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer text-center"
                      >
                        +$50
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tenderType === 'VOUCHER' && (
                <div className="space-y-3 p-4 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <label className="text-xs text-zinc-400 block">Voucher / Gift Card Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. GIFT-8492-XQ"
                      value={tenderVoucherCode}
                      onChange={e => setTenderVoucherCode(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-indigo-500"
                    />
                    <Button
                      disabled={validatingVoucher || !tenderVoucherCode.trim()}
                      onClick={handleLookupVoucher}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-xl cursor-pointer"
                    >
                      {validatingVoucher ? 'Verifying...' : 'Validate'}
                    </Button>
                  </div>
                  {voucherDetails && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      Available Balance: ${Number(voucherDetails.currentBalance).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {tenderType === 'CARD' && (
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 text-center space-y-2">
                  <CreditCard size={32} className="mx-auto text-indigo-400" />
                  <p className="text-xs font-medium text-zinc-300">
                    Ready for EFTPOS terminal or manual card charge of ${cartTotals.total.toFixed(2)}
                  </p>
                </div>
              )}

              {tenderType === 'ON_ACCOUNT' && (
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                  <p className="text-xs text-zinc-300">
                    {selectedCustomer 
                      ? `Charge $${cartTotals.total.toFixed(2)} to ${selectedCustomer.organization?.legalName || selectedCustomer.person?.firstName}'s account.`
                      : 'Please select a customer first to charge on account.'}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  className="bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    isProcessingOrder || 
                    (tenderType === 'ON_ACCOUNT' && !selectedCustomer) ||
                    (tenderType === 'CASH' && tenderAmount < cartTotals.total)
                  }
                  onClick={handleCompleteOrder}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold cursor-pointer disabled:opacity-40"
                >
                  {isProcessingOrder ? 'Processing...' : 'Complete Payment & Emit Journal'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Customer Picker */}
      <AnimatePresence>
        {showCustomerPicker && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-white font-bold text-sm">Select Customer Profile</span>
                <button onClick={() => setShowCustomerPicker(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {(Array.isArray(customerList) ? customerList : [])
                  .filter((c: any) => {
                    const name = c.organization?.legalName || `${c.person?.firstName || ''} ${c.person?.lastName || ''}`;
                    return name.toLowerCase().includes(customerSearch.toLowerCase());
                  })
                  .map((c: any) => {
                    const name = c.organization?.legalName || `${c.person?.firstName || ''} ${c.person?.lastName || ''}`.trim() || 'Unnamed';
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerPicker(false);
                        }}
                        className="p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{name}</p>
                          <p className="text-[10px] text-zinc-400">{c.partyType}</p>
                        </div>
                        <ChevronRight size={14} className="text-zinc-500" />
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: Receipt Display / Printing */}
      <AnimatePresence>
        {completedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Sale Successful!</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{completedOrder.orderNumber}</p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-mono space-y-1">
                {Number(completedOrder.discountTotal) > 0 && (() => {
                  const sub = Number(completedOrder.subtotal) || (Number(completedOrder.total) + Number(completedOrder.discountTotal));
                  const disc = Number(completedOrder.discountTotal) || 0;
                  const pct = sub > 0 ? Math.round((disc / sub) * 100) : 0;
                  return (
                    <>
                      <div className="flex justify-between text-zinc-400">
                        <span>Subtotal</span>
                        <span>${sub.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>Discount {pct > 0 && `(${pct}%)`}</span>
                        <span>-${disc.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-between text-zinc-300 font-bold">
                  <span>Total Paid</span>
                  <span className="text-emerald-400 font-bold">${Number(completedOrder.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>GST Collected</span>
                  <span>${Number(completedOrder.taxTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>GL Journal</span>
                  <span>Posted</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => window.print()}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </Button>
                <Button
                  onClick={() => setCompletedOrder(null)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded-xl font-bold cursor-pointer"
                >
                  Next Sale
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Shift Z-Report Summary */}
      <AnimatePresence>
        {zReportData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                <Receipt size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Shift Z-Report Summary</h3>
                <p className="text-xs text-zinc-400 font-mono">Register Shift Closed</p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Sales:</span>
                  <span className="text-white font-bold">${Number(zReportData.grossSales || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cash Counted:</span>
                  <span className="text-white">${Number(zReportData.actualCashCount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cash Variance:</span>
                  <span className={Number(zReportData.cashVariance || 0) < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    ${Number(zReportData.cashVariance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setZReportData(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-xl font-bold cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: Sales History & Orders Directory */}
      <AnimatePresence>
        {showSalesHistory && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-white">Sales History & Processed Orders</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {filteredSalesOrders.length} {filteredSalesOrders.length === 1 ? 'sale' : 'sales'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      View past counter transactions, inspect itemized totals, and reprint receipts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowSalesHistory(false);
                    setSelectedHistoryOrder(null);
                  }}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Controls Bar */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryScope('SHIFT');
                        fetchOrders('SHIFT');
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        historyScope === 'SHIFT'
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      Current Shift
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryScope('ALL');
                        fetchOrders('ALL');
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        historyScope === 'ALL'
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      All Past Orders
                    </button>
                  </div>

                  <Button
                    onClick={() => fetchOrders(historyScope)}
                    disabled={loadingOrders}
                    className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} className={cn(loadingOrders && "animate-spin")} />
                    <span>Refresh</span>
                  </Button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input
                    type="text"
                    placeholder="Search order #, customer, item..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body: Split View */}
              <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-800 overflow-hidden">
                {/* Left Column: Orders List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {loadingOrders ? (
                    <div className="py-16 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-zinc-400 font-mono">Loading processed orders...</p>
                    </div>
                  ) : filteredSalesOrders.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-500">
                        <Receipt size={22} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-300">No sales orders found</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {historySearch 
                            ? 'Try modifying your search filter.' 
                            : 'Completed sales from this register will appear here automatically.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    filteredSalesOrders.map(order => {
                      const isSelected = selectedHistoryOrder?.id === order.id;
                      const customerName = order.customer?.organization?.legalName || 
                        `${order.customer?.person?.firstName || ''} ${order.customer?.person?.lastName || ''}`.trim() || 
                        'Walk-in Customer';
                      const primaryPayment = order.payments?.[0];
                      const badge = getTenderBadge(primaryPayment?.tenderType || 'CARD');

                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedHistoryOrder(order)}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                            isSelected
                              ? "bg-indigo-600/15 border-indigo-500/60 shadow-sm"
                              : "bg-zinc-850/60 hover:bg-zinc-800 border-zinc-800/80"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-white">{order.orderNumber}</span>
                              <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", badge.color)}>
                                {badge.label}
                              </span>
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-mono">
                                COMPLETED
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                              <span>{customerName}</span>
                              <span>•</span>
                              <span className="text-zinc-500">{formatOrderDate(order.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate max-w-sm">
                              {(order.items || []).map((i: any) => `${i.quantity}x ${i.title}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                            <span className="text-base font-extrabold font-mono text-emerald-400">
                              ${Number(order.total).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Column: Receipt & Detail Inspection Panel */}
                <div className="w-full md:w-80 lg:w-96 p-4 sm:p-5 bg-zinc-950/80 overflow-y-auto shrink-0 flex flex-col justify-between">
                  {selectedHistoryOrder ? (
                    <div className="space-y-4">
                      {/* Receipt Header */}
                      <div className="text-center pb-3 border-b border-zinc-800 space-y-1">
                        <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">Aurora Retail POS</p>
                        <h3 className="text-base font-black text-white font-mono">{selectedHistoryOrder.orderNumber}</h3>
                        <p className="text-[11px] text-zinc-500 font-mono">{formatOrderDate(selectedHistoryOrder.createdAt)}</p>
                        <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono mt-1">
                          <CheckCircle2 size={11} />
                          <span>GL Journal Posted</span>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="text-xs space-y-1 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono block">Customer Profile</span>
                        <p className="text-white font-semibold">
                          {selectedHistoryOrder.customer?.organization?.legalName || 
                            `${selectedHistoryOrder.customer?.person?.firstName || ''} ${selectedHistoryOrder.customer?.person?.lastName || ''}`.trim() || 
                            'Walk-in Counter Customer'}
                        </p>
                      </div>

                      {/* Itemized Lines */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono block">Purchased Items</span>
                        <div className="divide-y divide-zinc-800/60 text-xs">
                          {(selectedHistoryOrder.items || []).map((line: any, idx: number) => (
                            <div key={idx} className="py-2 flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <p className="text-zinc-200 font-medium">{line.title}</p>
                                <p className="text-[10px] text-zinc-400 font-mono">
                                  {line.quantity} × ${Number(line.unitPrice).toFixed(2)}
                                  {Number(line.discountAmount) > 0 && (() => {
                                    const gross = Number(line.quantity) * Number(line.unitPrice);
                                    const disc = Number(line.discountAmount);
                                    const pct = gross > 0 ? Math.round((disc / gross) * 100) : 0;
                                    return (
                                      <span className="text-emerald-400 font-semibold ml-1">
                                        (-${disc.toFixed(2)}{pct > 0 ? ` • ${pct}% off` : ''})
                                      </span>
                                    );
                                  })()}
                                </p>
                              </div>
                              <span className="text-zinc-200 font-mono font-bold shrink-0">
                                ${Number(line.lineTotal || (line.quantity * line.unitPrice) - (line.discountAmount || 0)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totals Breakdown */}
                      <div className="pt-2 border-t border-zinc-800 space-y-1 text-xs font-mono">
                        <div className="flex justify-between text-zinc-400">
                          <span>Subtotal</span>
                          <span>${Number(selectedHistoryOrder.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(selectedHistoryOrder.discountTotal) > 0 && (() => {
                          const sub = Number(selectedHistoryOrder.subtotal) || 0;
                          const disc = Number(selectedHistoryOrder.discountTotal) || 0;
                          const pct = sub > 0 ? Math.round((disc / sub) * 100) : 0;
                          return (
                            <div className="flex justify-between text-emerald-400 font-medium">
                              <span className="flex items-center gap-1">
                                <span>Discounts</span>
                                {pct > 0 && (
                                  <span className="text-[10px] font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    {pct}%
                                  </span>
                                )}
                              </span>
                              <span>-${disc.toFixed(2)}</span>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between text-zinc-400">
                          <span>GST (10%)</span>
                          <span>${Number(selectedHistoryOrder.taxTotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-extrabold text-white pt-1 border-t border-zinc-800">
                          <span>Total Paid</span>
                          <span className="text-emerald-400">${Number(selectedHistoryOrder.total).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Tender details */}
                      <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-1 text-xs font-mono">
                        <span className="text-[10px] text-zinc-400 uppercase block font-sans">Payment Method</span>
                        {(selectedHistoryOrder.payments || []).map((pay: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-zinc-300">
                            <span className="font-semibold">{pay.tenderType}</span>
                            <span>${Number(pay.amount).toFixed(2)}</span>
                          </div>
                        ))}
                        {selectedHistoryOrder.payments?.[0]?.changeGiven > 0 && (
                          <div className="flex justify-between text-zinc-400 text-[11px] pt-1 border-t border-zinc-800">
                            <span>Change Returned:</span>
                            <span>${Number(selectedHistoryOrder.payments[0].changeGiven).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex gap-2">
                        <Button
                          onClick={() => {
                            setCompletedOrder(selectedHistoryOrder);
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer shadow-md shadow-indigo-600/20"
                        >
                          <Printer size={14} />
                          <span>Print / Reprint Receipt</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-zinc-500">
                      <FileText size={28} className="text-zinc-600 mb-1" />
                      <p className="text-xs font-medium text-zinc-400">No order selected</p>
                      <p className="text-[11px] text-zinc-500">
                        Click any order from the list on the left to inspect its full receipt and financial breakdown.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: Touch Keypad & Item Adjuster */}
      <AnimatePresence>
        {showNumpadModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
                    numpadMode === 'DISC' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    numpadMode === 'QTY' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    numpadMode === 'PRICE' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  )}>
                    {numpadMode === 'DISC' ? <Percent size={18} /> :
                     numpadMode === 'QTY' ? <Calculator size={18} /> :
                     numpadMode === 'PRICE' ? <DollarSign size={18} /> :
                     <Plus size={18} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-tight">
                      {numpadMode === 'DISC' ? 'Apply Discount' :
                       numpadMode === 'QTY' ? 'Set Quantity' :
                       numpadMode === 'PRICE' ? 'Override Unit Price' :
                       'Add Custom Charge'}
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      {numpadMode === 'CUSTOM_ITEM'
                        ? 'Enter price and item description'
                        : 'Touchpad or physical keyboard (Enter to apply)'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNumpadModal(false)}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode Selector Tabs */}
              <div className="p-2 border-b border-zinc-800/80 bg-zinc-950/40 shrink-0">
                <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                  {[
                    { id: 'DISC', label: '% Disc' },
                    { id: 'QTY', label: 'Qty' },
                    { id: 'PRICE', label: '$ Price' },
                    { id: 'CUSTOM_ITEM', label: '+ Custom' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setNumpadMode(m.id as any);
                        setNumpadInput('');
                      }}
                      className={cn(
                        "py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center",
                        numpadMode === m.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Context (Item Info & Digital Output) */}
              <div className="p-3 bg-zinc-950/80 border-b border-zinc-800/60 shrink-0">
                {numpadMode === 'CUSTOM_ITEM' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Item Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Corkage, Special Catering, Custom Work..."
                      value={customItemTitle}
                      onChange={e => setCustomItemTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Target Cart Item</label>
                      {cart.length > 1 && (
                        <span className="text-[10px] text-zinc-500">{cart.length} items in cart</span>
                      )}
                    </div>
                    {cart.length > 1 ? (
                      <select
                        value={selectedCartLineId || ''}
                        onChange={e => setSelectedCartLineId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        {cart.map(line => (
                          <option key={line.id} value={line.id}>
                            {line.title} ({line.quantity}x @ ${line.unitPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="font-semibold text-white truncate max-w-[200px]">
                          {cart.find(l => l.id === selectedCartLineId)?.title || 'No item selected'}
                        </span>
                        <span className="font-mono text-zinc-400 text-[11px]">
                          {cart.find(l => l.id === selectedCartLineId)?.quantity}x • ${cart.find(l => l.id === selectedCartLineId)?.unitPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Digital Value Display */}
                <div className="mt-2.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                      {numpadMode === 'DISC' ? 'Discount Percentage' :
                       numpadMode === 'QTY' ? 'New Quantity' :
                       numpadMode === 'PRICE' ? 'New Unit Price' :
                       'Custom Amount'}
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-medium truncate">
                      {numpadMode === 'DISC' && (() => {
                        const targetLine = cart.find(l => l.id === selectedCartLineId);
                        const discNum = parseFloat(numpadInput) || 0;
                        if (!targetLine || discNum <= 0) return 'Enter 0% to 100%';
                        const rawSavings = (targetLine.quantity * targetLine.unitPrice) * (Math.min(100, discNum) / 100);
                        const finalTotal = (targetLine.quantity * targetLine.unitPrice) - rawSavings;
                        return `Saves $${rawSavings.toFixed(2)} → Line: $${Math.max(0, finalTotal).toFixed(2)}`;
                      })()}
                      {numpadMode === 'QTY' && (() => {
                        const targetLine = cart.find(l => l.id === selectedCartLineId);
                        const qtyNum = parseInt(numpadInput, 10) || 1;
                        if (!targetLine) return 'Enter quantity';
                        return `Line Total: $${(qtyNum * targetLine.unitPrice).toFixed(2)}`;
                      })()}
                      {numpadMode === 'PRICE' && (() => {
                        const targetLine = cart.find(l => l.id === selectedCartLineId);
                        const prNum = parseFloat(numpadInput) || 0;
                        if (!targetLine) return 'Enter price';
                        return `Line Total: $${(targetLine.quantity * prNum).toFixed(2)}`;
                      })()}
                      {numpadMode === 'CUSTOM_ITEM' && 'Single item added to cart'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-mono font-extrabold text-emerald-400">
                      {numpadInput ? (
                        numpadMode === 'DISC' ? `${numpadInput}%` :
                        numpadMode === 'QTY' ? `${numpadInput}x` :
                        `$${numpadInput}`
                      ) : '0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/30 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mr-1 shrink-0">Presets:</span>
                  {numpadMode === 'DISC' && [5, 10, 15, 20, 25, 50, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleNumpadPreset(pct)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 border border-zinc-700/60 transition-all cursor-pointer shrink-0"
                    >
                      {pct === 100 ? 'Free' : `${pct}%`}
                    </button>
                  ))}
                  {numpadMode === 'QTY' && [1, 2, 3, 5, 10, 20].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleNumpadPreset(q)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-300 border border-zinc-700/60 transition-all cursor-pointer shrink-0"
                    >
                      {q}x
                    </button>
                  ))}
                  {(numpadMode === 'PRICE' || numpadMode === 'CUSTOM_ITEM') && [5, 10, 20, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleNumpadPreset(amt)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-300 border border-zinc-700/60 transition-all cursor-pointer shrink-0"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Touch Numpad Grid */}
              <div className="p-3.5 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    '1', '2', '3',
                    '4', '5', '6',
                    '7', '8', '9',
                    '.', '0', '00'
                  ].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleNumpadTap(k)}
                      className="py-3 bg-zinc-800/80 hover:bg-zinc-750 active:scale-95 text-white font-mono font-bold text-base rounded-2xl border border-zinc-700/50 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleNumpadTap('CLEAR')}
                    className="py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-zinc-700/60 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadTap('BACKSPACE')}
                    className="py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-zinc-700/60 cursor-pointer"
                  >
                    ⌫ Back
                  </button>
                  <Button
                    onClick={applyNumpadAction}
                    disabled={!numpadInput}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-40"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
