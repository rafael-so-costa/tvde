<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>FrotaPRO</title>
    @viteReactRefresh
    @vite(['resources/css/app.css','resources/js/main.tsx'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
