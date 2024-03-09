const db = require('./database');
const morgan=require('morgan');
const express=require('express');
const router=require('express-promise-router')();
const exp = require('express');
const cors=require('cors');
const bodyParser = require('body-parser');
const { as } = require('pg-promise');
var bcrypt = require('bcryptjs');
const { v4: uuidv4, validate: uuidValidate, parse: uuidParse } = require('uuid');



router.use(express.urlencoded({ extended: true }));

async function db_query(query,params) {
    let res=await db.query(query,params)
    .then((result) => {
       console.log(":Checking result in db_quesry");
       //console.log( result);
       return result;
    });
    console.log("Checkiing response");
    //console.log(res);
    return res;
}

router.get('/products',async(req,res)=>{
  const query="SELECT * FROM product";
  const params=[];
  const result=await db_query(query,params);
  console.log("we are here");
  console.log(result);
  res.status(200).json(result);
});


router.post('/customerSignUp', async (req, res) => {
      console.log(req.body);
      const { name, phone_number,password} = req.body;
      const salt = await bcrypt.hash(password,12);
      console.log(salt);
      const query="CALL customer_signup($1,$2,$3)";
      const values=[name,phone_number,salt];
      try{
        const result=await db_query(query,values);
        console.log(result);
        res.status(200).send(result);
      }
      catch(error){
        console.error('Error adding row:', error);
        res.status(500).send('Error adding row to the database.');
      }
});

router.post('/shopSignUp', async (req, res) => {
  console.log(req.body);
  const { name,phone_number,license_no,password} = req.body;
  const salt = await bcrypt.hash(password,12);
  console.log(salt);
  const query="CALL shop_signup($1,$2,$3,$4)";
  const values=[name,phone_number,license_no,salt];
  try{
    const result=await db_query(query,values);
    const new_query="select * from shop where license_no=$3";
    const new_result=await db_query(new_query,values);
    console.log(new_result);
    const query_log="insert into admin_log values($1,$2)";
    const values_log=[name,"procedure:shop_signup"];
    const result_log=await db_query(query_log,values_log);
    res.status(200).send(new_result);
  }
  catch(error){
    console.error('Error adding row:', error);
    res.status(500).send('Error adding row to the database.');
  }
});


router.post('/customerinfo',async(req,res)=>{
      const {phone_number}=req.body;
      const query="insert into customer (name) values($1)";
      const values=[phone_number];
      try{
        const result=await db_query(query,values);
        console.log(result);
        res.status(200).send('Row added successfully!');
      }
      catch(error){
        console.error('Error adding row:', error);
        res.status(500).send('Error adding row to the database.');
      }
})

router.post('/shoplogin', async (req, res) => {
  const { license_no,password } = (req.body);
  console.log(req.body);
  console.log(license_no);
  console.log(password);
  const login_query='SELECT get_hashed_password($1) as hash_password'; 
  const values = [license_no, password]; 
  try {
    const shop = await db_query(login_query, values);
    console.log(shop);
    if(shop){
      const comp=await bcrypt.compare(password,shop[0].hash_password);
      if(comp){
        const query="select * from shop where license_no=$1";
        const values=[license_no];
        const shop_1=await db_query(query,values);
        console.log('login successful', comp);
        const query_log="insert into admin_log values($1,$2)";
        const values_log=[shop_1[0].name,"procedure:shop_login"];
        const result_log=await db_query(query_log,values_log);
        res.status(200).send(shop_1);
      }
    }
    else{
      res.status(500).send('Error verifying.');
    }
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).send('Error updating row to the database.');
  }
});


router.post('/customerlogin', async (req, res) => {
  const { phone_number,password } = req.body;
  console.log(req.body);
  console.log(phone_number);
  const login_query='select log_in($1) as result'; 
  const values = [phone_number]; 
  try {
    const user = await db.query(login_query, values);
    console.log(user);
    if(user){
      const comp=await bcrypt.compare(password,user[0].result);
      if(comp){
        console.log('login successful', comp);
        const query="select * from customer where phone_number=$1";
        const values=[phone_number];
        const user_1=await db_query(query,values);
        const query_log="insert into admin_log values($1,$2)";
        const values_log=[user_1[0].name,"function:customer_login"];
        const result_log=await db_query(query_log,values_log);
        res.status(200).send(user_1);
      }
      else{
        res.status(500).send('Error verifying.');
      }
    }
    else{
      console.log('login unsuccessful',comp);
      res.status(300).send('login failed');
    }
  } catch (error) {
    console.error('Error logging in', error);
    res.status(500).send('Error logging in to the database.');
  }
});



router.post('/shop/product_update', async (req, res) => {
  //const temp=(req.body);
  const { product_id,license_no,availability,discount } = req.body;

  // Update the row in the database
  let updateQuery = "";
  const values = [product_id,license_no,availability,discount];
  try {
    if(availability=="" && discount==""){
      res.status(300).send('Nothing to be updated');
    }
    else if(availability==""){
      updateQuery = 'UPDATE discount SET discount = $4 WHERE shop_license = $2 and product_id=$1';
    }
    else if(discount==""){
      updateQuery = 'UPDATE discount SET availability = $3 WHERE shop_license = $2 and product_id=$1';
    }
    else{
      updateQuery = 'UPDATE discount SET availability=$3,discount = $4 WHERE shop_license = $2 and product_id=$1';
    }
    const result = await db.query(updateQuery, values);
    console.log('Row updated successfully:', result);
    res.status(200).send('Row updated successfully!');
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).send('Error updating row to the database.');
  }
});




router.get('/shop/add_product_page',async (req,res)=>{
  try{
    const query="select sub_category from category where sub_id=any (select distinct category from category)";
    const result= await db_query(query,[]);
    console.log("Checking result");
    console.log(result);
    const categories=[];
    for (const row of result) {
        //console.log(typeof(row.sub_category));
        categories.push(row.sub_category);
    }
    //console.log(categories[1]);
    const final_result=[];
    
    let i=0;
    for(const category of categories){
      const f_result=[];
        const values=[category];
        console.log(values);
        const sub_query="select sub_id,category,sub_category from category where category=(select sub_id from category where sub_category=$1)";
        const sub_result= await db_query(sub_query,values);
        //console.log(sub_result);
        for(const row of sub_result){
            const sub_category={id:row.sub_id,name:row.category,cat:row.sub_category};
            //console.log(sub_category);
            f_result.push(sub_category);
        }
        const object={key:category,value: f_result};
        console.log(object);
        final_result.push(object);
    }
    console.log(final_result);
    res.status(200).json(final_result)
  }catch(error){
    console.error('Error deleting row:', error);
    res.status(500).send('Error deleting row from the database.');
  }
});

router.post('/shop/add_product', async (req, res) => {
  //const temp=(req.body);
  const { product_name,brand_name,price,availability,category,discount,license_no,cat_id } = req.body;

  // Update the row in the database
  const updateQuery = 'INSERT INTO product (product_name,brand_name,id,price) VALUES ($1,$2,$3,$4)';
  let id=await db.query("select count_product()",[]);
  const values = [product_name,brand_name,id,price];
  try{
    db.query(updateQuery, values).then((result) => {
      const uquery='INSERT INTO DISCOUNT (product_id,shop_license,availability,discount) VALUES ($1,$2,$3,$4)';
      const uvalues=[id,license_no,availability,discount];
      return db.query(uquery,uvalues);
    }).then((result) => {
      const uquery1="insert into product_category (s_id,product_id) values((select sub_id from category where sub_category=$1 and category=$3),$2) "
      const uvalues1=[category,id,cat_id];
      return db.query(uquery1,uvalues1);
    })
  }
  catch(error) {
    console.error('Error updating row:', error);
    res.status(500).send('Error updating row to the database.');
  }
});


router.post('/shop_show_products',async(req,res)=>{
  const {license_No}=req.body;
  console.log(license_No);
  const query="select d.discount,d.availability,p.product_name,p.brand_name,p.price,p.id,p.image from (select * from shop  where license_no=$1) s join discount d on s.license_no=d.shop_license join product p on d.product_id=p.id";
  const values = [license_No];
  try{
    const result=await db_query(query,values);
    console.log('Row deleted successfully:', result);
    res.status(200).send(result);
  }
  catch(error){
    console.error('Error showing products', error);
    res.status(500).send('Error showing products from the database.');
  }
})


router.post('/shop/signout', async (req, res) => {
  //const temp=(req.body);
  const { license_no } = req.body;

  // Update the row in the database
  const deleteQuery = 'DELETE FROM SHOP WHERE license_no = $1';
  const deleteQuery2 = 'DELETE FROM DISCOUNT WHERE license_no = $1';
  const values = [license_no];
  try {
    const result = await db.query(deleteQuery, values);
    const res=await db.query(deleteQuery2,values);
    console.log('Row deleted successfully:', result);
    res.status(200).send('Row deleted successfully!');
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).send('Error deleting row from the database.');
  }
});


router.post('/shop_delete_product', async (req, res) => {
    const { product_id,shop_license } = req.body;
    console.log(product_id);
    console.log(shop_license);
    try{
      const deleteQuery = 'DELETE FROM DISCOUNT WHERE product_id = $1 and shop_license=$2';
      const values = [product_id,shop_license];
      const result = await db_query(deleteQuery, values);
      console.log('Row deleted successfully:', result);
      res.status(200).send('Row deleted successfully!');
    }
    catch(error){
      console.error('Error deleting row:', error);
      res.status(500).send('Error deleting row from the database.');
    }
})


router.get('/',async(req,res)=>{
    
    try{
      const query="select sub_category from category where sub_id=any (select distinct category from category)";
      const result= await db_query(query,[]);
      console.log("Checking result");
      console.log(result);
      const categories=[];
      for (const row of result) {
          //console.log(typeof(row.sub_category));
          categories.push(row.sub_category);
      }
      //console.log(categories[1]);
      const final_result=[];
      
      let i=0;
      for(const category of categories){
        const f_result=[];
          const values=[category];
          console.log(values);
          const sub_query="select sub_id,category,sub_category from category where category=(select sub_id from category where sub_category=$1)";
          const sub_result= await db_query(sub_query,values);
          //console.log(sub_result);
          for(const row of sub_result){
              const sub_category={id:row.sub_id,name:row.category,cat:row.sub_category};
              //console.log(sub_category);
              f_result.push(sub_category);
          }
          const object={key:category,value: f_result};
          console.log(object);
          final_result.push(object);
      }
      console.log(final_result);
      res.status(200).json(final_result)
    }catch(error){
      console.error('Error deleting row:', error);
      res.status(500).send('Error deleting row from the database.');
    }
}); 


//router.post('shop/show_products',async(req,res)=>{

router.get('/productsundersubcategory',async(req,res)=>{

});

router.post('/productsundersubcategory',async(req,res)=>{
      let {subcategoryName}=req.body;
      let name=subcategoryName;
      console.log(name);
      name=name.replace("'", " ");
      console.log(name.toLowerCase());
      const product_query="select * from (select * from category  where lower(replace(category.sub_category,'''',' '))=$1) c join product_category pc on c.sub_id=pc.s_id  join product p on pc.product_id=p.id join discount d on d.product_id=p.id;";
      const product_result=await db_query(product_query,[name.toLowerCase()]);
      console.log(product_result);
      res.status(200).json(product_result);
});



router.post('/product_info',async(req,res)=>{
  const {product_id,shop_license}=req.body;
  const query="select * from (select * from discount where product_id=$1 and shop_license=$2) d join product on d.product_id=product.id";
  const params=[product_id,shop_license];
  try {
    const result = await db.query(query, params);
    console.log('Row deleted successfully:', result);
    res.status(200).send('Row deleted successfully!');
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).send('Error deleting row from the database.');
  }
});

router.post('/searchbar',async(req,res)=>{
  let {text}=req.body;
  console.log(text);
  text="%"+text.toUpperCase()+"%";
  console.log(text);
  const query="select * from  (select * from product  where upper(product_name) like $1) p join discount d on d.product_id=p.id join shop s on s.license_no=d.shop_license";
  try{
    const result=await db.query(query,[text]);
    console.log(result);
    if(result.length==0){
      res.status(500).send('Nothing to be shown');
    }
    else{
      res.status(200).json(result);
    }
  }
  catch(error){
    console.error('Error deleting row:', error);
    res.status(500).send('Error deleting row from the database.');
  }
})


router.post('/order',async(req,res)=>{
  const {customer_phone,products}=req.body;
  
  //const query="Insert into cart_customer (customer_phone) values($1)";
  try {
    const query="Insert into cart_customer (customer_phone,id) values($1,$2)";
    let cart_id_num=await db.query("select count_cust()",[]);
    console.log(cart_id_num);
    cart_id_num=cart_id_num[0].count_cust;
    console.log(cart_id_num);
    const params=[customer_phone,cart_id_num];
    const result = await db.query(query, params);
    console.log('Row inserted successfully:', result);
    let pro=[];
    for(let product of products){
      const values=[cart_id_num,product.product_id,product.license,product.quantity];
      console.log(product.product_id);
      const query="insert into cart_product (id,product_id,license,quantity) values($1,$2,$3,$4)";
      try{
        const result=await db.query(query,values);
        console.log('Row inserted successfully:', result);
      }catch(error){
        pro.push(product.product_id);
        console.error('Error inserting row:', error);
      }
    }
    if(pro.length>0){
      res.status(200).send(pro);
    }
    else{
      
      res.status(200).send();
    }
  } catch (error) {
    console.error('Order Not placed', error);
    res.status(500).send('Order not placed.');
  }
});


router.post('/make_review',async(req,res)=>{
  const {customer_phone,shop_license,product_id,opinion,rating}=req.body;
  const values=[customer_phone,shop_license,product_id,opinion,rating];
  const query="insert into product_review (customer_phone,shop_license,product_id,opinion,rating) values($1,$2,$3,$4,$5)";
  try {
    const result = await db.query(query, values);
    console.log('Row deleted successfully:', result);
    res.status(200).send('Row deleted successfully!');
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).send('Error deleting row from the database.');
  }
});

router.post('/show_reviews',async(req,res)=>{
  const {product_id,shop_license}=req.body;
  const values=[product_id,shop_license];
  const query="select c.phone_number,c.name,r.opinion,r.rating from product_review r join customer c on c.phone_number=r.customer_phone where product_id=$1 and shop_license=$2";
  try {
    const result = await db.query(query, values);
    console.log(result);
    res.status(200).send(result);
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).send('Error deleting row from the database.');
  }
});

router.post('/show_orders',async(req,res)=>{
  const {shop_license}=req.body;
  const values=[shop_license];
  //const query='SELECT ccu.id cid,c.phone_number number,c.name,p.product_name product,p.id,p.brand_name,p.price,cpr.quantity FROM cart_customer ccu JOIN cart_product cpr on ccu.id=cpr.id join customer c on ccu.customer_phone=c.phone_number join product p on p.id=cpr.product_id WHERE cpr.license=$1';
  const qu='select o.id,o.product_id,o.quantity,o.license,o.time,p.product_name,p.brand_name,p.price,p.image from order_table o join product p on o.product_id=p.id where license=$1';
  try {
    const result = await db.query(qu, values);
    console.log(result);
    res.status(200).send(result);
  } catch (error) {
    console.error('Error showing orders', error);
    res.status(500).send('Error showing orders from the database.');
  }
});


router.post('/add_to_cart',async(req,res)=>{
  const {customer_phone,products}=req.body;
  let id;
  const qu="select id from cart_customer where customer_phone=$1";
  const pa=[customer_phone];
  id=await db.query(qu,pa);
  id=id[0].id;
  for(let p of products){
    const query1='select * from cart_product where id=$1 and product_id=$2 and license=$3';
    let values=[id,p.product_id,p.license,p.quantity];
    const result1 = await db.query(query1, values);
    if(result1.length>0){
      const query2='update cart_product set quantity=$4 where id=$1 and product_id=$2 and license=$3';
      const result2 = await db.query(query2, values);
      res.status(200).send('Order added to cart');
    }
    else{
      const query='insert into cart_product values($1,$2,$4,$3);';
      try {
        const result = await db.query(query, values);
        res.status(200).send('Order added to cart');
      } catch (error) {
        console.error('Error confirming order', error);
        res.status(500).send('Order added to cart');
      }
    }
  }
});



router.post('/show_cart',async(req,res)=>{
  const {customer_phone}=req.body;
  console.log("customer phone:",customer_phone);
  let id;
  const qu="select id from cart_customer where customer_phone=$1";
  const pa=[customer_phone];
  id=await db.query(qu,pa);
  const query='select * from cart_product join product on cart_product.product_id=product.id join discount on cart_product.product_id=discount.product_id where cart_product.id=$1 '
  const val=[id[0].id];
  try{
    const result = await db.query(query, val);
    console.log("result",result);
    res.status(200).send(result);
  }
  catch(error){
    console.error('Error showing cart', error);
    res.status(500).send('Error showing cart from the database.');
}
});


router.post('/confirm_order',async(req,res)=>{
  const {customer_phone,billing_address}=req.body;
  let id;
  const qu="select id from cart_customer where customer_phone=$1";
  const pa=[customer_phone];
  id=await db.query(qu,pa);
  id=id[0].id;
  try{
    const query_sum="select cust_price_sum($1) as sum;";
    const val_sum=[customer_phone];
    const l_sum = await db.query(query_sum, val_sum);
    console.log(l_sum[0].sum);
    let sum=l_sum[0].sum;
    const query_de='call balance_deduct($1,$2)';
    const val_de=[sum,id];
    const result_de = await db.query(query_de, val_de);
    const query_pay='select count(*) as c from payment';
    const r = await db.query(query_pay);
    let pay_id=r[0].c;
    const pay_query='insert into payment (id,amount,billing_address,c_phone,transaction_status) values($1,$2,$3,$4)';
    const stst="paid"
    const pay_val=[pay_id,sum,billing_address,customer_phone,stst];
    const query='delete from cart_product where id=$1';
    const val=[id];
    const result = await db.query(query, val);
    res.status(200).send("confirmed successfully");
  }
  catch(error){
    console.error('Error confirming order', error);
    res.status(500).send('Error confirming order from the database.');
  }
});

router.post('/checkout',async(req,res)=>{
  const {customer_phone}=req.body;
  const query="call cust_price_sum($1,$2)";
  let sum;
  const val=[customer_phone,sum];
  try{
    const result = await db.query(query, val);
    console.log(result);
    res.status(200).send(result);
  }
  catch(error){
    console.error('Error confirming order', error);
    res.status(500).send('Error confirming order from the database.');
  }
});


router.post('/shop_confirmation',async(req,res)=>{
  const {shop_license,products}=req.body;
  const val=[shop_license];
  for(let p of products){
    const query1='delete from order_table where id=$1 and product_id=$2 and license=$3';
    try{
      let values=[p.id,p.product_id,p.license,p.quantity,p.time];
      const result1 = await db.query(query1, values);
      const query='insert into history values($1,$2,$4,$5,$3)';
      const result = await db.query(query, values);
      //console.log(result);
    }catch(error){
    console.error('Error confirming order', error);
    res.status(500).send('Error confirming order from the database.');
  }
}
res.status(200).send("parsi");
});

router.post('/show_order_history',async(req,res)=>{
  const {customer_phone}=req.body;
  const query='select * from history h join product p on h.product_id=p.id where h.id=(select id from cart_customer where customer_phone=$1)';
  const val=[customer_phone];
  try{
    const result=await db.query(query,val);
    console.log(result);
    res.status(200).send(result);
  }catch(error){
    console.error('Error showing history', error);
    res.status(500).send('Error showing history from the database.');
  }
});

router.post('show_payment_history',async(req,res)=>{ 
  const {customer_phone}=req.body;
  const query='select * from payment where c_phone=$1';
  const val=[customer_phone];
  try{
    const result=await db.query(query,val);
    console.log(result);
    res.status(200).send(result);
  }catch(error){
    console.error('Error showing history', error);
    res.status(500).send('Error showing history from the database.');
  }
});



const app=express();
app.use(express.json());
app.use(cors());
app.options('*',cors());
app.use(morgan('dev'));
app.use(router);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.listen(3000,()=>{
  console.log('Server is listening on port 3000');
});

