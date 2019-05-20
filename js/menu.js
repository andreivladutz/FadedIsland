init_menu = function(){
    
    let list_items = document.getElementsByClassName("option");
    for(let i = 0; i < list_items.length; i++){
        console.log(i);
        list_items[i].addEventListener("mouseover", function(){
            list_items[i].classList.add("hovered");
            list_items[i].addEventListener("mouseout", function(){
                list_items[i].classList.remove("hovered");
            })
        })
    }
    
    
    
}