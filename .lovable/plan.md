## Remove restaurant accounting from Statistics page

### What
Remove the restaurant revenue / profit / orders KPI section from `src/pages/Statistics.tsx`, plus all supporting imports and calculations that become unused.

### Changes
1. **Remove the KPI card row** (lines ~385-389) showing:
   - Restaurant revenue
   - Estimated profit  
   - Orders count

2. **Remove supporting imports** that become unused:
   - `useOrders`, `useProducts` from `@/lib/restaurant-store`
   - `OrderItem` from `@/lib/restaurant-store`
   - `DollarSign`, `ShoppingCart` from `lucide-react`

3. **Remove supporting queries & variables** that become unused:
   - `allOrderItems` useQuery hook
   - `filteredOrders`, `productMap`, `paidOrders`, `totalRevenue`, `totalProfit`, `totalOrdersCount` computed values

### Result
The Statistics page will show only visitor analytics, room usage, program attendance, and demographic charts — no restaurant accounting figures.