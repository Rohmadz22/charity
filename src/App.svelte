<script>

	import router from 'page';
	import Home from "./pages/Home.svelte";
	import About from "./pages/About.svelte";
	import Contact from "./pages/Contact.svelte";
	import Donation from "./pages/Donation.svelte";

	let page, params;

router("/", () =>(page = Home));
router("/about", () =>(page = About));
router("/contact", () =>(page = Contact));
router("/donation/:id", (ctx, next) =>{
params = ctx.params;
next();
},
(page = Donation));



router.start();
</script>

<svelte:component this={page} {params} />