-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 23, 2025 at 04:12 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `chaploy`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `username`, `password`, `customer_id`, `role`) VALUES
(1, 'Ploychom', '$2b$10$ftG7gy2h/gZGOxsZyXF9HOqUvX49deW/Fu0NEEPTzy0u1lCFr/o2.', 1, 'user'),
(2, 'Nana', '$2b$10$pr6CAWawKV4.hjO7o490nesHm9NIwYGf8HHyNso6E0.nwnS2JD4fK', 2, 'user');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'Tea', 'รวมชาทุกประเภทจากทั่วโลก ทั้งใบชาและชาซองเกรดพรีเมียม', '2025-10-11 07:51:12'),
(2, 'Coffee', 'รวมเมล็ดกาแฟรสเข้มจากหลากหลายสายพันธุ์', '2025-10-11 07:51:12'),
(3, 'Herbal & Wellness Tea', 'ชาสมุนไพร / ชาเพื่อสุขภาพ เช่น ชาคาโมมายล์ ชามินต์ ชาเปปเปอร์มินต์', '2025-10-11 07:51:12'),
(4, 'Flavored & Blended Tea', 'ชาผสมกลิ่นผลไม้หรือดอกไม้ เช่น ชามะลิ ชาซากุระ ชาเบอร์รี่', '2025-10-11 07:51:12'),
(5, 'Limited & Seasonal', 'ชา/กาแฟที่มีเฉพาะฤดูกาล หรือคอลเลคชันพิเศษ', '2025-10-11 07:51:12'),
(6, 'Accessories', 'อุปกรณ์ชงชา-กาแฟ เช่น ช้อนตวง / ที่กรองชา / กาน้ำชา / แก้ว', '2025-10-11 07:51:12'),
(7, 'Gift Set & Box', 'ชุดของขวัญ / Tea Box / Coffee Sampler ', '2025-10-11 07:51:12');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `firstname`, `lastname`, `phone`, `email`) VALUES
(1, 'Ploychom', 'Chana', '0855555555', 'qwe73885@gmail.com'),
(2, 'Nana', 'Naa', '0955555555', 'ploychompookumloun1947@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `loglogin`
--

CREATE TABLE `loglogin` (
  `id` int(11) NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `login_time` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `loglogin`
--

INSERT INTO `loglogin` (`id`, `account_id`, `staff_id`, `username`, `role`, `login_time`) VALUES
(1, NULL, 1, 'Chaploy', 'admin', '2025-10-22 18:52:36'),
(2, 1, NULL, 'Ploychom', 'user', '2025-10-22 18:52:58'),
(3, NULL, 1, 'Chaploy', 'admin', '2025-10-22 18:53:21'),
(4, NULL, 1, 'Chaploy', 'admin', '2025-10-22 19:02:00'),
(5, 1, NULL, 'Ploychom', 'user', '2025-10-22 19:03:28'),
(6, NULL, 1, 'Chaploy', 'admin', '2025-10-22 19:03:52'),
(7, NULL, 1, 'Chaploy', 'admin', '2025-10-22 19:11:06'),
(8, 2, NULL, 'Nana', 'user', '2025-10-22 20:14:36'),
(9, 1, NULL, 'Ploychom', 'user', '2025-10-22 20:18:55'),
(10, NULL, 1, 'Chaploy', 'admin', '2025-10-22 20:19:16'),
(11, NULL, 1, 'Chaploy', 'admin', '2025-10-22 20:22:57');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `order_date` datetime DEFAULT current_timestamp(),
  `total` decimal(10,2) NOT NULL,
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `order_status` enum('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
  `payment_method` enum('cod','bank','credit','paypal') DEFAULT 'cod',
  `shipping_address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `cancelled_by` int(11) DEFAULT NULL,
  `receipt_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `customer_id`, `order_date`, `total`, `payment_status`, `order_status`, `payment_method`, `shipping_address`, `phone`, `email`, `created_at`, `updated_at`, `cancelled_by`, `receipt_path`) VALUES
(1, 1, '2025-10-22 17:24:38', 3660.00, 'paid', 'confirmed', 'bank', 'Thailand', '0855555555', 'qwe73885@gmail.com', '2025-10-22 17:24:38', '2025-10-22 19:15:37', NULL, '/uploads/receipts/receipt_0001.pdf'),
(2, 1, '2025-10-22 17:28:56', 199.00, 'pending', 'cancelled', 'bank', 'Thailand', '0855555555', 'qwe73885@gmail.com', '2025-10-22 17:28:56', '2025-10-22 17:30:04', NULL, NULL),
(3, 1, '2025-10-22 17:29:46', 890.00, 'pending', 'cancelled', 'bank', 'Thailand', '0855555555', 'qwe73885@gmail.com', '2025-10-22 17:29:46', '2025-10-22 17:47:59', 1, NULL),
(4, 2, '2025-10-22 20:17:53', 1199.00, 'pending', 'pending', 'bank', 'thailand', '0955555555', 'ploychompookumloun1947@gmail.com', '2025-10-22 20:17:53', '2025-10-22 20:17:53', NULL, NULL),
(5, 2, '2025-10-22 20:18:24', 1590.00, 'pending', 'pending', 'bank', 'Thailand', '0955555555', 'ploychompookumloun1947@gmail.com', '2025-10-22 20:18:24', '2025-10-22 20:18:24', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_each` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `price_each`, `subtotal`) VALUES
(1, 1, 14, 1, 590.00, 590.00),
(2, 1, 16, 1, 570.00, 570.00),
(3, 1, 25, 1, 2500.00, 2500.00),
(4, 2, 10, 1, 199.00, 199.00),
(5, 3, 18, 1, 890.00, 890.00),
(6, 4, 29, 1, 1199.00, 1199.00),
(7, 5, 20, 1, 1590.00, 1590.00);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `customer_id`, `token`, `expires_at`) VALUES
(7, 1, '', '2025-10-22 17:18:20');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `payment_date` datetime DEFAULT current_timestamp(),
  `amount` decimal(10,2) NOT NULL,
  `method` enum('bank','credit','paypal') DEFAULT 'bank',
  `slip_image` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('pending','verified','failed','refunded') DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `order_id`, `payment_date`, `amount`, `method`, `slip_image`, `email`, `status`, `verified_by`, `verified_at`) VALUES
(1, 1, '2025-10-22 17:24:38', 3660.00, 'bank', '/uploads/slips/slip_1761128678740.jpg', 'qwe73885@gmail.com', 'verified', 1, '2025-10-22 19:15:37'),
(2, 2, '2025-10-22 17:28:56', 199.00, 'bank', '/uploads/slips/slip_1761128936052.jpg', 'qwe73885@gmail.com', 'pending', NULL, NULL),
(3, 3, '2025-10-22 17:29:46', 890.00, 'bank', '/uploads/slips/slip_1761128986604.jpg', 'qwe73885@gmail.com', 'pending', NULL, NULL),
(4, 4, '2025-10-22 20:17:53', 1199.00, 'bank', '/uploads/slips/slip_1761139073754.jpg', 'ploychompookumloun1947@gmail.com', 'pending', NULL, NULL),
(5, 5, '2025-10-22 20:18:24', 1590.00, 'bank', '/uploads/slips/slip_1761139104078.jpg', 'ploychompookumloun1947@gmail.com', 'pending', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `stock` int(11) DEFAULT 0,
  `image` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `categories_id` int(11) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `price`, `created_by`, `stock`, `image`, `created_at`, `updated_at`, `updated_by`, `status`, `categories_id`, `cost`) VALUES
(6, 'Olivia', '', 250.00, 1, 18, '/uploads/products/1760154942529.jpg', '2025-10-11 10:55:42', '2025-10-16 13:50:16', NULL, 'inactive', 1, 175.00),
(7, 'Essential', '', 320.00, 1, 0, '/uploads/products/1760154984230.jpg', '2025-10-11 10:56:24', '2025-10-16 13:50:16', 1, 'active', 2, 224.00),
(8, 'Fix Coffee', '', 500.00, 2, 39, '/uploads/products/1760155303652.jpg', '2025-10-11 11:01:43', '2025-10-22 02:26:30', 3, 'active', 2, 350.00),
(9, 'Paper', '', 450.00, 2, 12, '/uploads/products/1760155362284.jpg', '2025-10-11 11:02:42', '2025-10-16 13:50:16', NULL, 'active', 2, 315.00),
(10, 'PSD Coffee', '', 199.00, 2, 54, '/uploads/products/1760155825030.jpg', '2025-10-11 11:10:25', '2025-10-22 17:28:56', NULL, 'active', 2, 139.30),
(11, 'Terra', '', 255.00, 3, 10, '/uploads/products/1760156816807.jpg', '2025-10-11 11:26:56', '2025-10-16 13:50:16', NULL, 'active', 1, 178.50),
(12, 'Loli', '', 115.00, 3, 15, '/uploads/products/1760156949500.jpg', '2025-10-11 11:29:09', '2025-10-16 13:50:16', NULL, 'active', 1, 80.50),
(13, 'Mogo', '', 189.00, 3, 2, '/uploads/products/1760157342291.jpg', '2025-10-11 11:35:42', '2025-10-16 13:50:16', NULL, 'active', 1, 132.30),
(14, 'Porin', '', 590.00, 3, 47, '/uploads/products/1760157589688.jpg', '2025-10-11 11:39:49', '2025-10-22 17:24:38', NULL, 'active', 3, 413.00),
(15, 'Nustasia', '', 477.00, 3, 65, '/uploads/products/1760157612628.jpg', '2025-10-11 11:40:12', '2025-10-16 13:50:16', NULL, 'active', 3, 333.90),
(16, 'Rec', '', 570.00, 3, 48, '/uploads/products/1760157641008.jpg', '2025-10-11 11:40:41', '2025-10-22 17:24:38', NULL, 'active', 3, 399.00),
(17, 'Kiko', '', 265.00, 3, 5, '/uploads/products/1760157665430.jpg', '2025-10-11 11:41:05', '2025-10-16 13:50:16', NULL, 'active', 3, 185.50),
(18, 'Torso', '', 890.00, 2, 4, '/uploads/products/1760157945289.jpg', '2025-10-11 11:45:45', '2025-10-22 17:29:46', NULL, 'active', 4, 623.00),
(19, 'Losso', '', 150.00, 2, 8, '/uploads/products/1760157977025.jpg', '2025-10-11 11:46:17', '2025-10-16 13:50:16', NULL, 'active', 4, 105.00),
(20, 'Japan Tea', '', 1590.00, 2, 4, '/uploads/products/1760158104229.jpg', '2025-10-11 11:48:24', '2025-10-22 20:18:24', NULL, 'active', 5, 1113.00),
(21, 'Pasis', '', 2599.00, 2, 2, '/uploads/products/1760158140904.jpg', '2025-10-11 11:49:00', '2025-10-16 13:50:16', NULL, 'active', 5, 1819.30),
(22, 'Pesser', '', 590.00, 2, 6, '/uploads/products/1760158315429.jpg', '2025-10-11 11:51:55', '2025-10-16 13:50:16', NULL, 'active', 6, 413.00),
(23, 'Accessories Tea', '', 890.00, 2, 7, '/uploads/products/1760158356857.jpg', '2025-10-11 11:52:36', '2025-10-16 13:50:16', NULL, 'active', 6, 623.00),
(24, 'Basu', '', 950.00, 2, 6, '/uploads/products/1760158387205.jpg', '2025-10-11 11:53:07', '2025-10-16 13:50:16', NULL, 'active', 6, 665.00),
(25, 'Box set', '', 2500.00, 2, 25, '/uploads/products/1760158421969.jpg', '2025-10-11 11:53:41', '2025-10-22 18:11:12', 1, 'active', 7, 1750.00),
(29, 'tree', '', 1199.00, 1, 29, '/uploads/products/1761132387807.jpg', '2025-10-22 18:26:27', '2025-10-22 20:17:53', 1, 'active', 7, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `stfID` int(11) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','manager','staff') DEFAULT 'admin',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`stfID`, `fullname`, `email`, `username`, `password`, `role`, `created_at`) VALUES
(1, 'Chaploy', 'chaploy.house@gmail.com', 'Chaploy', '1234', 'admin', '2025-10-11 07:10:42'),
(2, 'Pim', 'pim.admin@gmail.com', 'Pim', '1234', 'admin', '2025-10-11 11:00:21'),
(3, 'Niracha', 'nira.admin@gmail.com', 'Nira', '1234', 'admin', '2025-10-11 11:00:28'),
(4, 'Ploychompoo', 'ploychompookumloun1947@gmail.com', 'Ploychom', '$2b$10$nX73Ha.9f0YLQiKQw94gze8mFF8tLQDzeYz9cS3.BaxyuLUQlR0vK', 'admin', '2025-10-12 16:41:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `loglogin`
--
ALTER TABLE `loglogin`
  ADD PRIMARY KEY (`id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `fk_loglogin_staff` (`staff_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_orders_cancelled_by` (`cancelled_by`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_payment_order` (`order_id`),
  ADD KEY `fk_payments_verified_by` (`verified_by`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `categories_id` (`categories_id`),
  ADD KEY `fk_products_created_by` (`created_by`),
  ADD KEY `fk_products_updated_by` (`updated_by`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`stfID`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `loglogin`
--
ALTER TABLE `loglogin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `stfID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `fk_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loglogin`
--
ALTER TABLE `loglogin`
  ADD CONSTRAINT `fk_loglogin_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_loglogin_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`stfID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `staff` (`stfID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payment_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_payments_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `staff` (`stfID`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff` (`stfID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_products_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `staff` (`stfID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`categories_id`) REFERENCES `categories` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
