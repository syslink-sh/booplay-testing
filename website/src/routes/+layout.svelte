<script lang="ts">
	import '../app.css';

	import { ModeWatcher } from 'mode-watcher';
	import { onMount, untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { RenderScan } from 'svelte-render-scan';
	import { dev } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import AdBanner from '$lib/components/self/AdBanner.svelte';
	import AdSidePanels from '$lib/components/self/AdSidePanels.svelte';
	import AppSidebar from '$lib/components/self/AppSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ADS, initAds } from '$lib/stores/ads';
	import { USER_DATA } from '$lib/stores/user-data';
	import { websocketController } from '$lib/stores/websocket';

	const { data, children } = $props<{
		data: { userSession?: any };
		children: any;
	}>();

	untrack(() => USER_DATA.set(data?.userSession ?? null));
	$effect(() => {
		USER_DATA.set(data?.userSession ?? null);
	});

	onMount(() => {
		websocketController.connect();
		initAds();

		console.log(
			`%c                                       .--                    
                                      .=--:                   
                                   :=*#*:                     
                               .=******+#*.                   
                            .+*****+*#*+**#*                  
                          :**++**####*###*++#-                
                        =***+*####******###*+#*               
                      =***++#####***+++***%#*+*%:             
                    =*++*###+=++++====****##%#**#=            
                 .+**+=*##=*###+####*#+++*###%#**#=           
               :#*=**####=*#+-*##=-*##+**#####%##*%=          
     .      :+**++*###***++=*#++=*###**######%%%####:.--:     
    .---=******+*###****=***=-**+##*#+*###%%%***##%%#=--:     
     :-:  =#++**##***+++=******#*=##**#%%%##*#%*:             
           .**++*##***++**+**#*####+*%%#**#%+.                
             +***+##*=**=++******##%%*####:                   
              -#+++###***+*######%####%+                      
               .#*++*##**#####%%#**##=                        
                 *#*+*######%%#*###=                          
                  +#**#%%%%##**##-                            
                   =#***#*###%+.                              
                    -%#####*:                                 
                    .=%#*:                                    
                 .=--=.                                       
                   ::`,
			'color: #4962ee; font-family: monospace; font-size: 12px; font-weight: bold; text-shadow: 2px 2px rgba(0,0,0,0.2);'
		);
		console.log(
			'%c Welcome to BooPlay! DO NOT FUCKING PASTE ANYTHING IN THE CONSOLE UNLESS YOU KNOW WHAT YOU ARE DOING.',
			'color: #4962ee; font-family: monospace; font-size: 12px; font-weight: bold; text-shadow: 2px 2px rgba(0,0,0,0.2);'
		);
		console.log(
			'%c A product by Outpoot.com',
			'color: #4962ee; font-family: monospace; font-size: 12px; font-weight: bold; text-shadow: 2px 2px rgba(0,0,0,0.2);'
		);

		const url = new URL(window.location.href);
		if (url.searchParams.has('signIn')) {
			url.searchParams.delete('signIn');
			window.history.replaceState({}, '', url);
			invalidateAll();
		}

		return () => {
			websocketController.disconnect();
		};
	});

	function getPageTitle(routeId: string | null): string {
		if (!routeId) return 'Booplay';

		const titleMap: Record<string, string> = {
			'/': $_('page_names.home'),
			'/market': $_('page_names.market'),
			'/portfolio': $_('page_names.portfolio'),
			'/leaderboard': $_('page_names.leaderboard'),
			'/coin/create': $_('page_names.create_coin'),
			'/settings': $_('page_names.settings'),
			'/admin': $_('page_names.admin.main'),
			'/admin/promo': $_('page_names.admin.promo'),
			'/transactions': $_('page_names.transactions'),
			'/groups': $_('page_names.groups'),
			'/lottery': $_('page_names.lottery'),
			'/hopium': $_('page_names.hopium'),
			'/arcade': $_('page_names.arcade'),
			'/live': $_('page_names.live_trades'),
			'/treemap': $_('page_names.treemap'),
			'/about': $_('page_names.about'),
			'/legal/privacy': 'Privacy Policy',
			'/legal/terms': 'Terms of Service',
			'/shop': $_('page_names.shop'),
			'/advertisements': $_('page_names.advertisements'),
			'/1v1': '1v1 Duels'
		};

		// Handle dynamic routes
		if (routeId.startsWith('/coin/[coinSymbol]')) {
			return 'Coin Details';
		}
		if (routeId.startsWith('/user/[username]')) {
			return 'User Profile';
		}
		if (routeId.startsWith('/hopium/[id]')) {
			return 'Prediction Question';
		}

		return titleMap[routeId] || 'Booplay';
	}
</script>

<!-- <RenderScan /> -->
<ModeWatcher />
<Toaster richColors={true} />
<AdSidePanels hideAds={$USER_DATA?.hideAds ?? false} ads={$ADS} />

<Sidebar.Provider>
	<AppSidebar />

	<Sidebar.Inset class="sidebar-container">
		<header
			class="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex w-full items-center gap-4 px-4 lg:px-6">
				<Sidebar.Trigger class="-ml-1" />

				<h1 class="mr-6 text-base font-medium">
					{getPageTitle(page.route.id)}
				</h1>
			</div>
		</header>

		<AdBanner hideAds={$USER_DATA?.hideAds ?? false} ads={$ADS} />

		<div class="main-content-area">
			<div class="@container/main flex flex-col gap-2">
				<div class="flex flex-col gap-4 md:gap-6">
					<div class="px-4 md:py-4 lg:px-6">
						{@render children()}
					</div>
				</div>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
